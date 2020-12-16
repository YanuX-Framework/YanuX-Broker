const _ = require('lodash');

const { authenticate } = require('@feathersjs/authentication').hooks;
const { GeneralError } = require('@feathersjs/errors');

const mongooseOptions = require('../../hooks/mongoose-options');

const canReadEntity = require('../../hooks/authorization').canReadEntity;
const canWriteEntity = require('../../hooks/authorization').canWriteEntity;

function clearInactive(context) {
  if (context.method !== 'remove') {
    const cutOffDateTime = new Date(new Date().getTime() - context.app.get('beacons').maxInactivityTime);
    return context.service.remove(null, {
      query: { updatedAt: { $lt: cutOffDateTime } }
    }).then(() => context).catch(e => { throw e; })
  } else { return context; }
}

function updateProxemics(context) {
  if (context.type !== 'after') { throw new GeneralError('This must be run as an \'after\' hook.') }
  if (context.method !== 'create' && context.method !== 'patch' && context.method !== 'update' && context.method !== 'remove') {
    return context;
  }

  let beacons;
  if (context.data) {
    beacons = _.isArray(context.data) ? context.data : [context.data];
  }
  if (context.result) {
    beacons = beacons ||
      _.isArray(context.result) ? context.result :
      _.isObject(context.result) && _.isArray(context.result.data) ? context.result.data :
        [context.result];
  }
  if (context.params && context.params.query) {
    beacons = beacons || [context.params.query];
  }

  if (!beacons.every(b => b.deviceUuid && b.beacon && b.beacon.values)) {
    return context;
  }

  //TODO: [UPDATE LEGACY PROXIMITY POSITIONING]
  const proximityUpdate = b => {
    return new Promise((resolve, reject) => {
      let scanningDevice, detectedDevice, currUser;
      Promise.all([
        context.app.service('devices').find({ query: { $limit: 1, deviceUuid: b.deviceUuid } }),
        context.app.service('devices').find({ query: { $limit: 1, beaconValues: b.beacon.values } })
      ]).then(devices => {
        scanningDevice = (devices[0].data ? devices[0].data : devices[0])[0];
        detectedDevice = (devices[1].data ? devices[1].data : devices[1])[0];
        if (!scanningDevice || !detectedDevice) {
          // If either of the devices is missing from the database it's either an error or there's nothing to do with them.
          throw new GeneralError('Either the scanning device or the detected device are absent from the database.');
          //TODO: Make sure that if want to disable the following condition!
        } else if (true /* scanningDevice.user.equals(detectedDevice.user)*/ /* && scanningDevice.deviceUuid !== detectedDevice.deviceUuid */) {
          //TODO:
          //Not sure if currUser should be scanningDevice.user or detectedDevice.user. 
          //The former makes more sense, but from experience I feel that the latter is somewhat more consistent.
          currUser = scanningDevice.user;
          return Promise.all([
            context.app.service('proxemics').find({ query: { $limit: 1, user: currUser } }),
            context.app.service('beacons').find({
              query: {
                user: currUser,
                //TODO: Had to do the comparison this way, Feathers and/or Mongoose refuse to match the array directly. 
                ...detectedDevice.beaconValues.reduce((out, curr, i) => Object.assign(out, { ['beacon.values.' + i]: curr }, {})),
                updatedAt: { $gt: new Date().getTime() - context.app.get('beacons').maxInactivityTime }
              }
            })
          ]);
        }
      }).then(result => {
        if (result && result[0] && result[1]) {
          const currentProxemics = (result[0].data ? result[0].data : result[0])[0];
          const currentBeacons = result[1].data ? result[1].data : result[1];

          const proxemics = {
            user: currentProxemics ? currentProxemics.user : currUser || currUser,
            state: currentProxemics ? _.cloneDeep(currentProxemics.state) : {} || {}
          }

          if (currentBeacons.length && currentBeacons.every(b => b.beacon.avgRssi > context.app.get('beacons').avgRssiThreshold)) {
            proxemics.state[detectedDevice.deviceUuid] = detectedDevice.capabilities;
          } else { delete proxemics.state[detectedDevice.deviceUuid]; }

          if (!currentProxemics || !_.isEqual(currentProxemics.state, proxemics.state)) {
            return context.app.service('proxemics').patch(null, proxemics, { query: { user: proxemics.user } })
          }
        }
      }).then(() => { resolve(context); }).catch(e => reject(e));
    });
  }

  return Promise.all(beacons.map(b => proximityUpdate(b))).then(() => context).catch(e => { throw e });
}

module.exports = {
  before: {
    all: [authenticate('jwt', 'yanux'), clearInactive],
    find: [],
    get: [],
    create: [canWriteEntity],
    update: [canWriteEntity, mongooseOptions({ upsert: true })],
    patch: [canWriteEntity, mongooseOptions({ upsert: true })],
    remove: [canWriteEntity]
  },
  after: {
    all: [],
    find: [canReadEntity],
    get: [canReadEntity],
    create: [updateProxemics],
    update: [updateProxemics],
    patch: [updateProxemics],
    remove: [updateProxemics]
  },
  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};