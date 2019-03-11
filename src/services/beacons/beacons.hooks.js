const { authenticate } = require('@feathersjs/authentication').hooks;
const { Conflict } = require("@feathersjs/errors");
const _ = require('lodash');

const BEACONS_MAX_INACTIVITY_TIMER = 30000;

function beforeCreate(context) {
  if (context.params.user
    && context.data.beaconKey
    && context.data.deviceUuid) {
    const user = context.params.user;
    const beaconkey = context.data.beaconKey;
    const deviceUuid = context.data.deviceUuid;
    return this.remove(null, {
      query: {
        user: user._id,
        deviceUuid: deviceUuid,
        beaconKey: beaconkey
      }
    }).then(beacon => {
      return context;
    }).catch(e => { throw e; });
  }
}

function beforePatchAndUpdate(context) {
  if (context.data &&
    context.data.beacon &&
    context.params.query) {
    const beacon = context.data.beacon;
    const query = context.params.query;
    return this.find({ query: query, paginate: false })
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
        } else if (beacons.every(b => beacon.timestamp > b.beacon.timestamp)) {
          return context;
        } else {
          throw new Error('The new beacon\'s timestamp is older than the one(s) already stored.');
        }
      }).catch(e => { throw e; });
  }
}

function proxemics(context) {
  if (context.type !== 'after') {
    throw new Error('This must be run as an \'after\' hook.')
  }
  // TODO: **FINISH** implementing proxemics notifications.
  // Only run the "meat" of this hook for external requests!
  if (context.params.provider) {
    let scanningDevice, detectedDevice, deviceUuid, detectedBeacon;
    if (context.data) {
      deviceUuid = context.data.deviceUuid;
      detectedBeacon = context.data.beacon;
    }
    if (context.params && context.params.query) {
      deviceUuid = deviceUuid || context.params.query.deviceUuid;
      detectedBeacon = detectedBeacon || context.params.query.beacon;
    }
    if (context.result && context.result.length > 0) {
      deviceUuid = deviceUuid || context.result[0].deviceUuid;
      detectedBeacon = detectedBeacon || context.result[0].beacon;
    }
    if (!deviceUuid || !detectedBeacon) {
      return context;
    }
    if (context.method === 'create'
      || context.method === 'patch'
      || context.method === 'remove') {
      /** 
       * NOTE: 
       * I'm not sure if this is the best idea to make sure that a proxemics record is ALWAYS present for the current user. 
       * But it's working fine right now. 
       */
      return new Promise((resolve, reject) => {
        context.app.service('proxemics')
          .create({ user: context.params.user._id })
          .then(proxemics => { resolve(proxemics) })
          .catch(e => {
            if (e instanceof Conflict) {
              resolve();
            } else {
              reject();
            }
          });
      }).then(() => Promise.all([
        context.app.service('devices').find({ query: { $limit: 1, deviceUuid: deviceUuid } }),
        context.app.service('devices').find({ query: { $limit: 1, beaconValues: detectedBeacon.values } })
      ])).then(devices => {
        scanningDevice = (devices[0].data ? devices[0].data : devices[0])[0];
        detectedDevice = (devices[1].data ? devices[1].data : devices[1])[0];
        if (!scanningDevice || !detectedDevice) {
          // If either of the devices is missing from the database it's either an error or there's nothing to do with them.
          throw new Error('Either the scanning device or the detected device are absent from the database.');
        } else if (!scanningDevice._id.equals(detectedDevice._id)) {
          // It's natural that the scanning device is able to detect itself whenever you're using "external beacons".
          // This is the interesting situation. Both devices are in the database and the scanning device is detecting a different device.
          // Moreover, check if the detected device is also detecting the scanned device.
          return Promise.all([
            context.app.service('beacons').find({
              query: {
                $limit: 1,
                /**
                 * TODO:
                 * This is just a sanity check to ensure that I don't get any old beacon entries that may happen to be laying around on the database.
                 * However, I should probably implement stronger mechanisms to ensure consistency. Right now, if the client has some hiccup while deleting a beacon there may be old data left behind at the server.
                 * I should also probably add a new hook that actually deletes old beacons before new ones are added. 
                 */
                updatedAt: {
                  $gt: new Date().getTime() - BEACONS_MAX_INACTIVITY_TIMER
                },
                deviceUuid: detectedDevice.deviceUuid,
                'beacon.values': scanningDevice.beaconValues
              }
            }),
            context.app.service('proxemics').find({
              query: {
                $limit: 1,
                user: context.params.user._id
              }
            })
          ]);
        }
      }).then(result => {
        if (result) {
          const beacon = (result[0].data ? result[0].data : result[0])[0];
          const currProxemics = (result[1].data ? result[1].data : result[1])[0];
          if (currProxemics) {
            let proxemics = {
              user: context.params.user._id,
              state: _.cloneDeep(currProxemics.state) || {}
            }
            if (beacon && (context.method === 'create' || context.method === 'patch')) {
              proxemics.state[detectedDevice.deviceUuid] = detectedDevice.capabilities;
            } else {
              delete proxemics.state[detectedDevice.deviceUuid];
            }
            if (!_.isEqual(currProxemics.state, proxemics.state)) {
              return context.app.service('proxemics').update(currProxemics._id, proxemics);
            }
          } else {
            throw new Error('Current proxemics state is missing.');
          }
        }
      }).then(() => { return context; }).catch(e => { throw e; });
    }
  }
  return context;
}

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [beforeCreate],
    update: [beforePatchAndUpdate],
    patch: [beforePatchAndUpdate],
    remove: []
  },
  after: {
    all: [],
    find: [],
    get: [],
    create: [proxemics],
    update: [proxemics],
    patch: [proxemics],
    remove: [proxemics]
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