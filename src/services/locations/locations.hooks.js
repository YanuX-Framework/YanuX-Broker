const util = require('util');

const { authenticate } = require('@feathersjs/authentication').hooks;
const { GeneralError } = require('@feathersjs/errors');

const feather = require('@feathersjs/feathers')

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

function skipSelfScan(context) {
  if (context.type !== 'before') { throw new GeneralError('This must be run as an \'before\' hook.') }

  if (context.method !== 'create' && context.method !== 'patch' && context.method !== 'update') {
    return context;
  }

  //TODO: Refactor to consider multiple location updates
  const location = context.data;
  if (location.proximity) {
    return context.app.service('devices').find({ query: { $limit: 1, deviceUuid: location.deviceUuid } }).then(devices => {
      const device = devices.data ? devices.data[0] : devices[0];
      if (location.proximity.beacon.uuid == device.beaconValues[0] &&
        location.proximity.beacon.major == device.beaconValues[1] &&
        location.proximity.beacon.minor == device.beaconValues[2]) {
        context.result = [];
        context.SKIP = true;
      }
      return context;
    });
  } else { return context; }
}

function updateProxemics(context) {
  if (context.SKIP) { return context; }

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

  if (!locations.every(l =>
    l.deviceUuid &&
    (
      (l.proximity && l.proximity.beacon && _.isString(l.proximity.beacon.uuid) && _.isNumber(l.proximity.beacon.major) && _.isNumber(l.proximity.beacon.minor)) ||
      (l.position && _.isNumber(l.position.x) && _.isNumber(l.position.y) && _.isString(l.position.place) && _.isString(l.position.zone))
    )
  )) { return context; }

  const orientationDifference = (o1, o2) => (o2 - o1 + 540) % 360 - 180;

  const getCloseDeviceUuids = locationPositions => {
    if (locationPositions && locationPositions.length >= 2) {
      const locationPairs = combinations(locationPositions.data ? locationPositions.data : locationPositions, 2, 2);
      const currDeviceUuids = new Set();
      locationPairs.forEach(([l1, l2]) => {
        if (!_.isNil(l1.position.x) && !_.isNil(l1.position.y) && !_.isNil(l2.position.x) && !_.isNil(l2.position.y)) {
          const distance = euclidean([l1.position.x, l1.position.y], [l2.position.x, l2.position.y]);
          const orientationDiff = Math.abs(orientationDifference(l1.position.orientation, l2.position.orientation))
          if (distance < context.app.get('locations').proximityDistanceThreshold
            && orientationDiff < context.app.get('locations').viewAngleThreshold) {
            currDeviceUuids.add(l1.deviceUuid); currDeviceUuids.add(l2.deviceUuid);
          }
        }
      });
      return Array.from(currDeviceUuids);
    } else { return []; }
  }

  const proximityUpdate = (l, ignoreAbsolutePositions = false) => {
    const now = new Date().getTime();
    let scanningDevice, detectedDevice, currUser;
    let closeBeaconValues = [];
    return new Promise((resolve, reject) => {
      Promise.all([
        context.app.service('devices').find({ query: { $limit: 1, $populate: 'user', deviceUuid: l.deviceUuid } }),
        context.app.service('devices').find({
          query: {
            $limit: 1, $populate: 'user',
            beaconValues: [
              l.proximity.beacon.uuid.toLowerCase(),
              l.proximity.beacon.major,
              l.proximity.beacon.minor
            ]
          }
        })
      ]).then(devices => {
        scanningDevice = (devices[0].data ? devices[0].data : devices[0])[0];
        detectedDevice = (devices[1].data ? devices[1].data : devices[1])[0];
        if (scanningDevice && scanningDevice.user && detectedDevice) {
          currUser = scanningDevice.user;
          return context.app.service('locations').find({
            query: {
              username: currUser.email,
              proximity: { $exists: true },
              /*
              'proximity.beacon.uuid': l.proximity.beacon.uuid,
              'proximity.beacon.major': l.proximity.beacon.major,
              'proximity.beacon.minor': l.proximity.beacon.minor,
              */
              updatedAt: { $gt: now - context.app.get('locations').maxInactivityTime }
            }
          })
        }
      }).then(result => {
        if (result) {
          const proximityLocations = result.data ? result.data : result;
          proximityLocations.forEach(pl => {
            const orientationLocations = proximityLocations.filter(ol => ol !== pl);
            if (pl.proximity.distance < context.app.get('locations').proximityDistanceThreshold &&
              (orientationLocations.length === 0 || orientationLocations.some(ol => {
                const orientationDiff = Math.abs(orientationDifference(pl.proximity.orientation, ol.proximity.orientation));
                //console.log('--- Orientation Difference ---:', orientationDiff);
                return orientationDiff < context.app.get('locations').viewAngleThreshold;
              }))
            ) {
              const beaconValues = [
                pl.proximity.beacon.uuid.toLowerCase(),
                pl.proximity.beacon.major,
                pl.proximity.beacon.minor
              ]
              closeBeaconValues.push(beaconValues)
            }
          });
          closeBeaconValues = _.uniqWith(closeBeaconValues, _.isEqual)
          return Promise.all([
            context.app.service('proxemics').find({ query: { $limit: 1, user: currUser._id } }),
            closeBeaconValues.length ?
              context.app.service('devices').find({ query: { $or: closeBeaconValues.length ? closeBeaconValues.map(beaconValues => { return { beaconValues }; }) : [] } }) :
              Promise.resolve([]),
            ignoreAbsolutePositions ? Promise.resolve([]) : context.app.service('locations').find({
              query: {
                username: currUser.email,
                position: { $exists: true },
                updatedAt: { $gt: now - context.app.get('locations').maxInactivityTime }
              }
            })
          ]);
        }
      }).then(result => {
        if (result) {
          const currentProxemics = (result[0].data ? result[0].data : result[0])[0];
          const devices = result[1].data ? result[1].data : result[1];

          const proxemics = {
            user: currentProxemics ? currentProxemics.user : currUser || currUser,
            state: devices.reduce((out, device) => Object.assign(out, { [device.deviceUuid]: device.capabilities }), {})
          }

          if (!ignoreAbsolutePositions) {
            const absolutePositionLocations = result[2].data ? result[2].data : result[2];
            const currDeviceUuids = getCloseDeviceUuids(absolutePositionLocations);
            for (const deviceUuid in proxemics.state) {
              if (absolutePositionLocations.find(al => (al.data ? al.data : al).deviceUuid === deviceUuid)
                && !currDeviceUuids.find(dUuid => dUuid === deviceUuid)
              ) { delete proxemics.state[deviceUuid]; }
            }
          }

          if (!currentProxemics || !_.isEqual(currentProxemics.state, proxemics.state)) {
            return context.app.service('proxemics').patch(null, proxemics, { query: { user: proxemics.user } })
          }
        }

      }).then(() => { resolve(true); }).catch(e => reject(e));
    });
  }

  const positionUpdate = l => {
    const now = new Date().getTime();
    let currDevice, currUser;
    return new Promise((resolve, reject) => {
      context.app.service('devices')
        .find({ query: { $limit: 1, deviceUuid: l.deviceUuid } })
        .then(d => {
          if (d) {
            currDevice = d.data ? d.data[0] : d[0];
            if (currDevice) {
              return context.app.service('users').get(currDevice.user);
            }
          }
        }).then(u => {
          if (u) {
            currUser = u;
            return context.app.service('locations').find({ query: { username: currUser.email, 'position.place': l.position.place } });
          }
        }).then(ls => {
          if (ls) {
            const coLocations = ls.data ? ls.data : ls;
            const currDeviceUuids = getCloseDeviceUuids(coLocations);
            if (currDeviceUuids.length) {
              return context.app.service('devices').find({ query: { $or: currDeviceUuids.map(deviceUuid => { return { deviceUuid }; }) } });
            } else { return []; }
          }
        }).then(ds => {
          const devices = ds.data ? ds.data : ds;
          if (devices) {
            const proxemics = {
              user: currUser._id,
              state: devices.reduce((out, device) => Object.assign(out, { [device.deviceUuid]: device.capabilities }), {})
            };
            return Promise.all([
              context.app.service('proxemics').patch(null, proxemics, { query: { user: proxemics.user } }),
              context.app.service('locations').find({
                query: {
                  username: currUser.email,
                  proximity: { $exists: true },
                  updatedAt: { $gt: now - context.app.get('locations').maxInactivityTime }
                }
              })
            ]);
          }
        }).then(result => {
          const proximityLocations = result[1].data ? result[1].data : result[1];
          return Promise.all(proximityLocations.map(pl => proximityUpdate(pl, true)));
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
    create: [skipSelfScan],
    update: [skipSelfScan, mongooseOptions({ upsert: true })],
    patch: [skipSelfScan, mongooseOptions({ upsert: true })],
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
