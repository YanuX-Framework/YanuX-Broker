const { authenticate } = require('@feathersjs/authentication').hooks;
const { GeneralError } = require('@feathersjs/errors');
const { resolve } = require('dnssd');
const { reject } = require('lodash');
const _ = require('lodash');
const mongooseOptions = require('../../hooks/mongoose-options');

function clearInactive(context) {
  const cutOffDateTime = new Date(new Date().getTime() - context.app.get('beacons').maxInactivityTime);
  return context.service.remove(null, {
    query: { updatedAt: { $lt: cutOffDateTime } }
  }).then(() => context).catch(e => { throw e; })
}

function beforePatchUpdate(context) {
  if (context.data && context.params.query) {
    const location = context.data;
    return context.service.find({ query: context.params.query, paginate: false })
      .then(locations => {
        const locationTimestamp = new Date(location.timestamp);
        if (locations.every(l => locationTimestamp >= l.timestamp)) {
          return context;
        } else { throw new GeneralError('The new location\'s timestamp is older than the one(s) already stored.'); }
      }).catch(e => { throw e; });
  }
}

function updateProxemics(context) {
  if (context.type !== 'after') { throw new GeneralError('This must be run as an \'after\' hook.') }
  if (context.method !== 'create' && context.method !== 'patch' && context.method !== 'update' && context.method !== 'remove') {
    return context;
  }

  let locations;
  if (context.data) {
    locations = _.isArray(context.data) ? context.data : [context.data];
  }
  if (context.result) {
    locations = locations ||
      _.isArray(context.result) ? context.result :
      _.isObject(context.result) && _.isArray(context.result.data) ? context.result.data :
        [context.result];
  }
  if (context.params && context.params.query) {
    locations = locations || [context.params.query];
  }

  if (!locations.some(l => l.deviceUuid && l.proximity && l.proximity.beacon
    && l.proximity.beacon.uuid && l.proximity.beacon.major && l.proximity.beacon.minor)) {
    return context;
  }

  //TODO: Check what I'm doing on ./beacons/beacon.hooks.js "updateProxemics" function for some inspiration.
  const proximityUpdate = l => {
    let scanningDevice, detectedDevice;
    return new Promise((resolve, reject) => {
      Promise.all([
        context.app.service('devices').find({ query: { $limit: 1, deviceUuid: l.deviceUuid } }),
        context.app.service('devices').find({
          query: {
            $limit: 1, beaconValues: [
              //TODO: Normalize UUIDs and other hexadecimal strings to either lowercase or uppercase.
              l.proximity.beacon.uuid.toUpperCase(),
              l.proximity.beacon.major,
              l.proximity.beacon.minor
            ]
          }
        })
      ]).then(devices => {
        scanningDevice = (devices[0].data ? devices[0].data : devices[0])[0];
        detectedDevice = (devices[1].data ? devices[1].data : devices[1])[0];
        if (!scanningDevice || !detectedDevice) {
          // If either of the devices is missing from the database it's either an error or there's nothing to do with them.
          throw new GeneralError('Either the scanning device or the detected device are absent from the database.');
          //TODO: WARNING: Watch out for the temporarily disabled code below!
        } else /* if (scanningDevice.user.equals(detectedDevice.user) && !scanningDevice._id.equals(detectedDevice._id)) */ {
          return Promise.all([
            context.app.service('proxemics').find({ query: { $limit: 1, user: detectedDevice.user } }),
            //TODO: I should probably make this query "sharing aware"!         
            context.app.service('locations').find({
              query: {
                'proximity.beacon.uuid': l.proximity.beacon.uuid,
                'proximity.beacon.major': l.proximity.beacon.major,
                'proximity.beacon.minor': l.proximity.beacon.minor,
                updatedAt: { $gt: new Date().getTime() - context.app.get('locations').maxInactivityTime }
              }
            })
          ]);
        }
      }).then(result => {
        if (result) {
          const currProxemics = (result[0].data ? result[0].data : result[0])[0];
          const currLocations = result[1].data ? result[1].data : result[1];

          const proxemics = {
            user: currProxemics ? currProxemics.user : detectedDevice.user || detectedDevice.user,
            state: currProxemics ? _.cloneDeep(currProxemics.state) : {} || {}
          }

          if (context.method === 'remove' || currLocations.every(cl => cl.proximity.distance > context.app.get('locations').proximityDistanceThreshold)) {
            delete proxemics.state[detectedDevice.deviceUuid];
          } else {
            proxemics.state[detectedDevice.deviceUuid] = detectedDevice.capabilities;
          }

          if (!currProxemics || !_.isEqual(currProxemics.state, proxemics.state)) {
            return context.app.service('proxemics').patch(null, proxemics, { query: { user: proxemics.user } })
          }
        }
      }).then(() => { resolve(true); }).catch(e => reject(e));
    });
  }

  return Promise.all(locations.map(l => {
    if (true || l.proximity) { return proximityUpdate(l) }
  })).then(() => context).catch(e => { throw e });
}


module.exports = {
  before: {
    all: [authenticate('jwt', 'yanux')/*, clearInactive */],
    find: [],
    get: [],
    create: [],
    update: [beforePatchUpdate, mongooseOptions({ upsert: true })],
    patch: [beforePatchUpdate, mongooseOptions({ upsert: true })],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
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
