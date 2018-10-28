const { authenticate } = require('@feathersjs/authentication').hooks;
const { Conflict } = require("@feathersjs/errors");


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
      return new Promise((resolve, reject) => {
        context.app.service('proxemics').create({
          user: context.params.user
        }).then(proxemics => {
          resolve(proxemics);
        }).catch(e => {
          if (e instanceof Conflict) {
            resolve();
          } else {
            reject(e);
          }
        });
      }).then(() => {
        return Promise.all([
          context.app.service('devices').find({ query: { $limit: 1, deviceUuid: deviceUuid } }),
          context.app.service('devices').find({ query: { $limit: 1, beaconValues: detectedBeacon.values } })
        ]).then(devices => {
          scanningDevice = (devices[0].data ? devices[0].data : devices[0])[0];
          detectedDevice = (devices[1].data ? devices[1].data : devices[1])[0];
          if (!scanningDevice || !detectedDevice) {
            // If either of the devices is missing from the database it's either an error or there's nothing to do with them.
            throw new Error('Either the scanning device or the detected device are absent from the database.');
          } else if (!scanningDevice._id.equals(detectedDevice._id)) {
            // It's natural that the scanning device is able to detect itself whenever you're using "external beacons".
            // This is the interesting situation. Both devices are in the database and the scanning device is detecting a different device.
            // Moreover, check if the detected device is also detecting the scanned device.
            return context.app.service('beacons').find({
              query: {
                $limit: 1,
                deviceUuid: detectedDevice.deviceUuid,
                'beacon.values': scanningDevice.beaconValues
              }
            });
          }
        }).then(result => {
          const beacon = (result.data ? result.data : result)[0];
          let event = {
            event: 'proxemics',
            payload: {
              to: { userId: context.params.user.email },
              type: null,
              scanningDevice: scanningDevice,
              detectedDevice: detectedDevice,
            }
          }
          if (context.method === 'create') {
            if (beacon) {
              event.payload.type = 'entered';
            } else {
              event.payload.type = 'entering';
            }
          } else if (context.method === 'patch') {
            if (beacon) {
              event.payload.type = 'staying';
            }
          } else if (context.method === 'remove') {
            if (beacon) {
              event.payload.type = 'leaving';
            } else {
              event.payload.type = 'left';
            }
          }
          if (event.payload.type) {
            return context.app.service('events').create(event);
          }
        }).then(() => { return context; }).catch(e => { throw e; });
      })
    }
    return context;
  }
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