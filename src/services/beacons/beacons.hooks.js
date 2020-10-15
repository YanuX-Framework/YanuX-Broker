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

function logBeacons(context) {
  if (context.result) {
    let results;
    if (_.isArray(context.result) || _.isArray(context.result.data)) {
      results = context.result.data ? context.result.data : context.result
    } else {
      results = [context.result]
    }
    let promises = [];
    results.forEach(result => {
      const data = _.clone(result)
      data._id = null;
      data.createdAt = null;
      data.updatedAt = null;
      data.method = context.method;
      promises.push(context.app.service('beacon-logs').create(data));
    });
    return Promise.all(promises).then(() => context)
  } else return context;
}

//TODO: This hook should no longer be necessary since we moved to use "PATCH + upsert" instead of CREATE.
function beforeCreate(context) {
  if (context.params.user && context.data.beaconKey && context.data.deviceUuid) {
    const user = context.params.user;
    const beaconkey = context.data.beaconKey;
    const deviceUuid = context.data.deviceUuid;
    return context.service.remove(null, {
      query: {
        user: user._id,
        deviceUuid: deviceUuid,
        beaconKey: beaconkey
      }
    }).then(() => context).catch(e => { throw e; });
  }
}

//TODO: This hook can probably be simplified since we added upsert support to UPDATE and PATCH.
function beforePatchUpdate(context) {
  if (context.data && context.data.beacon && context.params.query) {
    const beacon = context.data.beacon;
    const query = context.params.query;
    return context.service.find({ query: query, paginate: false })
      .then(beacons => {
        if (!beacons.length) {
          context.service.create({
            user: context.data.user || context.params.query.user,
            deviceUuid: context.data.deviceUuid || context.params.query.deviceUuid,
            beaconKey: context.data.beaconKey || context.params.query.beaconKey,
            beacon: beacon
          }).then(data => {
            context.result = [data];
            return context;
          }).catch(e => { throw e; });
        } else if (beacons.every(b => beacon.timestamp >= b.beacon.timestamp)) {
          return context;
        } else { throw new GeneralError('The new beacon\'s timestamp is older than the one(s) already stored.'); }
      }).catch(e => { throw e; });
  }
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
          currUser = detectedDevice.user;
          return Promise.all([
            context.app.service('proxemics').find({ query: { $limit: 1, user: currUser } }),
            context.app.service('beacons').find({
              query: {
                //TODO: Had to do the comparison this way, Feathers and/or Mongoose refuse to match the array directly. 
                ...detectedDevice.beaconValues.reduce((out, curr, i) => Object.assign(out, { ['beacon.values.' + i]: curr }, {})),
                updatedAt: { $gt: new Date().getTime() - context.app.get('beacons').maxInactivityTime }
              }
            })
          ]);
        }
      }).then(result => {
        if (result && result[0] && result[1]) {
          const currProxemics = (result[0].data ? result[0].data : result[0])[0];
          const currBeacons = result[1].data ? result[1].data : result[1];

          const proxemics = {
            user: currProxemics ? currProxemics.user : currUser || currUser,
            state: currProxemics ? _.cloneDeep(currProxemics.state) : {} || {}
          }

          if (context.method === 'remove' || currBeacons.every(b => b.beacon.avgRssi < context.app.get('beacons').avgRssiThreshold)) {
            delete proxemics.state[detectedDevice.deviceUuid];
          } else {
            proxemics.state[detectedDevice.deviceUuid] = detectedDevice.capabilities;
          }

          if (!currProxemics || !_.isEqual(currProxemics.state, proxemics.state)) {
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
    create: [canWriteEntity, beforeCreate],
    update: [canWriteEntity, beforePatchUpdate, mongooseOptions({ upsert: true })],
    patch: [canWriteEntity, beforePatchUpdate, mongooseOptions({ upsert: true })],
    remove: [canWriteEntity]
  },
  after: {
    all: [],
    find: [canReadEntity],
    get: [canReadEntity],
    create: [/* logBeacons, */ updateProxemics],
    update: [/* logBeacons, */ updateProxemics],
    patch: [/* logBeacons, */ updateProxemics],
    remove: [/* logBeacons, */ updateProxemics]
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