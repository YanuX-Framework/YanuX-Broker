const util = require('util');

const { authenticate } = require('@feathersjs/authentication').hooks;
const { GeneralError } = require('@feathersjs/errors');

const _ = require('lodash');
const combinations = require('combinations');
const { euclidean } = require('ml-distance-euclidean');
//const { dot, norm } = require('mathjs');

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

  if (!locations.every(l =>
    l.deviceUuid &&
    (
      (l.proximity && l.proximity.beacon && _.isString(l.proximity.beacon.uuid) && _.isNumber(l.proximity.beacon.major) && _.isNumber(l.proximity.beacon.minor)) ||
      (l.position && _.isNumber(l.position.x) && _.isNumber(l.position.y) && _.isString(l.position.place) && _.isString(l.position.zone))
    )
  )) { return context; }

  const getCloseDeviceUuids = locationPositions => {
    //const radToDeg = v => v * 180 / Math.PI;
    //const angleBetweenVectors = (v1, v2) => Math.acos(dot(v1, v2) / (norm(v1) * norm(v2)));
    if (locationPositions && locationPositions.length >= 2) {
      const locationPairs = combinations(locationPositions.data ? locationPositions.data : locationPositions, 2, 2);
      const currDeviceUuids = new Set();
      locationPairs.forEach(([l1, l2]) => {
        if (!_.isNil(l1.position.x) && !_.isNil(l1.position.y) && !_.isNil(l2.position.x) && !_.isNil(l2.position.y) &&
          _.isArray(l1.position.headingVector) && _.isArray(l2.position.headingVector)) {
          const distance = euclidean([l1.position.x, l1.position.y], [l2.position.x, l2.position.y]);
          const orientationDiff = Math.abs(l1.position.orientation - l2.position.orientation)
          // //const angleBetweenHeadings = radToDeg(angleBetweenVectors(l1.position.headingVector, l2.position.headingVector));
          // //const L1L2Vec = [l2.position.x - l1.position.x, l2.position.y - l1.position.y];
          // //const L2L1Vec = [l1.position.x - l2.position.x, l1.position.y - l2.position.y];
          // //const viewAngleL1 = radToDeg(angleBetweenVectors(l1.position.headingVector, L1L2Vec));
          // //const viewAngleL2 = radToDeg(angleBetweenVectors(l2.position.headingVector, L2L1Vec));
          // console.log('--------------------------------------------------------------------------------')
          // console.log('L1:', util.inspect(l1, false, null, true));
          // console.log('L2:', util.inspect(l2, false, null, true));
          // console.log(
          //   'Distance:', distance,
          //   'Orientation Difference:', orientationDiff,
          //   //'Angle Between Headings:', angleBetweenHeadings
          // );
          // //console.log('L1L2:', L1L2Vec, 'L2L1:', L2L1Vec);
          // //console.log('View Angle L1:', viewAngleL1, 'L2:', viewAngleL2);
          // console.log('--------------------------------------------------------------------------------')
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
    return new Promise((resolve, reject) => {
      Promise.all([
        context.app.service('devices').find({ query: { $limit: 1, deviceUuid: l.deviceUuid } }),
        context.app.service('devices').find({
          query: {
            $limit: 1, beaconValues: [
              l.proximity.beacon.uuid.toLowerCase(),
              l.proximity.beacon.major,
              l.proximity.beacon.minor
            ]
          }
        })
      ]).then(devices => {
        scanningDevice = (devices[0].data ? devices[0].data : devices[0])[0];
        detectedDevice = (devices[1].data ? devices[1].data : devices[1])[0];
        if (scanningDevice && scanningDevice.user
          /* && detectedDevice && scanningDevice.user.equals(detectedDevice.user) && !scanningDevice._id.equals(detectedDevice._id) */) {
          currUser = scanningDevice.user;
          return Promise.all([
            context.app.service('proxemics').find({ query: { $limit: 1, user: currUser } }),
            context.app.service('locations').find({
              query: {
                'proximity.beacon.uuid': l.proximity.beacon.uuid,
                'proximity.beacon.major': l.proximity.beacon.major,
                'proximity.beacon.minor': l.proximity.beacon.minor,
                updatedAt: { $gt: now - context.app.get('locations').maxInactivityTime }
              }
            }),
            ignoreAbsolutePositions ? Promise.resolve([]) :
              context.app.service('locations').find({
                query: {
                  username: currUser.email,
                  position: { $exists: true },
                  updatedAt: { $gt: now - context.app.get('locations').maxInactivityTime }
                }
              })
          ]);
        }
      }).then(result => {
        if (result && result[0] && result[1]) {
          const currentProxemics = (result[0].data ? result[0].data : result[0])[0];
          const proximityLocations = result[1].data ? result[1].data : result[1];

          const proxemics = {
            user: currentProxemics ? currentProxemics.user : currUser || currUser,
            state: currentProxemics ? _.cloneDeep(currentProxemics.state) : {} || {}
          }

          if (detectedDevice) {
            if (proximityLocations.length && proximityLocations.every(cl => cl.proximity.distance < context.app.get('locations').proximityDistanceThreshold)) {
              proxemics.state[detectedDevice.deviceUuid] = detectedDevice.capabilities;
            } else { delete proxemics.state[detectedDevice.deviceUuid]; }
          }

          if (!ignoreAbsolutePositions) {
            const absolutePositionLocations = result[2].data ? result[2].data : result[2];
            const currDeviceUuids = getCloseDeviceUuids(absolutePositionLocations);
            for (const deviceUuid in proxemics.state) {
              if (!currDeviceUuids.find(dUuid => dUuid === deviceUuid)) {
                delete proxemics.state[deviceUuid];
              }
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
