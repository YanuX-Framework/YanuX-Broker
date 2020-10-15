const { authenticate } = require('@feathersjs/authentication').hooks;
const { GeneralError } = require('@feathersjs/errors');
const _ = require('lodash');
const combinations = require('combinations');
const { euclidean } = require('ml-distance-euclidean');
const mongooseOptions = require('../../hooks/mongoose-options');

function clearInactive(context) {
  if (context.method !== 'remove') {
    const cutOffDateTime = new Date(new Date().getTime() - context.app.get('locations').maxInactivityTime);
    return context.service.remove(null, {
      query: { updatedAt: { $lt: cutOffDateTime } }
    }).then(() => context).catch(e => { throw e; })
  } else { return context; }
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

  if (!locations.some(l => l.deviceUuid && (
    (l.proximity && l.proximity.beacon && l.proximity.beacon.uuid && l.proximity.beacon.major && l.proximity.beacon.minor) ||
    (l.position && l.position.x && l.position.y && l.position.place && l.position.zone)
  ))) { return context; }

  const getCloseDeviceUuids = locationPositions => {
    if (locationPositions && locationPositions.length >= 2) {
      const locationPairs = combinations(locationPositions.data ? locationPositions.data : locationPositions, 2, 2);
      const currDeviceUuids = new Set();
      locationPairs.forEach(([loc1, loc2]) => {
        const distance = euclidean([loc1.position.x, loc1.position.y], [loc2.position.x, loc2.position.y]);
        if (distance < context.app.get('locations').proximityDistanceThreshold) {
          currDeviceUuids.add(loc1.deviceUuid); currDeviceUuids.add(loc2.deviceUuid);
        }
      });
      return Array.from(currDeviceUuids);
    } else { return []; }
  }

  //TODO: Check what I'm doing on ./beacons/beacon.hooks.js "updateProxemics" function for some inspiration.
  const proximityUpdate = l => {
    let scanningDevice, detectedDevice, currUser;
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
        if (scanningDevice /* && detectedDevice && scanningDevice.user.equals(detectedDevice.user) && !scanningDevice._id.equals(detectedDevice._id) */) {
          currUser = scanningDevice.user;
          return Promise.all([
            context.app.service('proxemics').find({ query: { $limit: 1, user: currUser } }),
            context.app.service('locations').find({
              query: {
                'proximity.beacon.uuid': l.proximity.beacon.uuid,
                'proximity.beacon.major': l.proximity.beacon.major,
                'proximity.beacon.minor': l.proximity.beacon.minor,
                updatedAt: { $gt: new Date().getTime() - context.app.get('locations').maxInactivityTime }
              }
            }),
            context.app.service('locations').find({
              query: {
                username: currUser.email,
                position: { $exists: true },
                updatedAt: { $gt: new Date().getTime() - context.app.get('locations').maxInactivityTime }
              }
            })
          ]);
        }
      }).then(result => {
        if (result && result[0] && result[1]) {
          const currProxemics = (result[0].data ? result[0].data : result[0])[0];
          const currProximityLocations = result[1].data ? result[1].data : result[1];
          const currPositionLocations = result[2].data ? result[2].data : result[2];

          const proxemics = {
            user: currProxemics ? currProxemics.user : currUser || currUser,
            state: currProxemics ? _.cloneDeep(currProxemics.state) : {} || {}
          }

          if (detectedDevice) {
            if (context.method === 'remove' || currProximityLocations.every(cl => cl.proximity.distance > context.app.get('locations').proximityDistanceThreshold)) {
              delete proxemics.state[detectedDevice.deviceUuid];
            } else {
              proxemics.state[detectedDevice.deviceUuid] = detectedDevice.capabilities;
            }
          }

          const currDeviceUuids = getCloseDeviceUuids(currPositionLocations);
          for (const deviceUuid in proxemics.state) {
            if (!currDeviceUuids.find(dUuid => dUuid === deviceUuid)) {
              delete proxemics.state[deviceUuid];
            }
          }

          if (!currProxemics || !_.isEqual(currProxemics.state, proxemics.state)) {
            return context.app.service('proxemics').patch(null, proxemics, { query: { user: proxemics.user } })
          }
        }
      }).then(() => { resolve(true); }).catch(e => reject(e));
    });
  }

  const positionUpdate = l => {
    return new Promise((resolve, reject) => {
      let currDevice, currUser;
      context.app.service('devices')
        .find({ query: { $limit: 1, deviceUuid: l.deviceUuid } })
        .then(d => {
          if (d) {
            currDevice = d.data ? d.data[0] : d[0];
            return context.app.service('users').get(currDevice.user);
          }
        }).then(u => {
          if (u) {
            currUser = u;
            return context.app.service('locations').find({ query: { username: currUser.email, 'position.place': l.position.place } });
          }
        }).then(ls => {
          const currDeviceUuids = getCloseDeviceUuids(ls);
          if (currDeviceUuids.length) {
            return context.app.service('devices').find({ query: { $or: currDeviceUuids.map(deviceUuid => { return { deviceUuid }; }) } });
          } else { return []; }
        }).then(ds => {
          const devices = ds.data ? ds.data : ds;
          if (devices) {
            const proxemics = { 
              user: currUser._id,
              state: devices.reduce((out, device) => Object.assign(out, { [device.deviceUuid]: device.capabilities }), {})
            };
            return context.app.service('proxemics').patch(null, proxemics, { query: { user: proxemics.user } });
          }
        }).then(() => { resolve(true); }).catch(e => reject(e));
    });
  }

  return Promise.all(locations.map(l => {
    if (l.proximity) { return proximityUpdate(l); }
    else if (l.position) { return positionUpdate(l); }
    else { throw new GeneralError('Something is wrong! A location should always have proximity or position information.') }
  })).then(() => context).catch(e => { throw e });
}


module.exports = {
  before: {
    all: [authenticate('jwt', 'yanux'), clearInactive],
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
