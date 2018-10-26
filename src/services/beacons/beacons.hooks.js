const { authenticate } = require('@feathersjs/authentication').hooks;

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
  // TODO: Implement proxemics notifications.
  console.log('Proxemics');
  // Only run the "meat" of this hook for external requests!
  if (context.params.provider) {
    let scanningDevice, detectedDevice;
    switch (context.method) {
      case 'create':
      case 'patch':
        const deviceUuid = context.data.deviceUuid || context.params.query.deviceUuid;
        const detectedBeacon = context.data.beacon;
        return Promise.all([
          context.app.service('devices').find({ query: { $limit: 1, deviceUuid: deviceUuid } }),
          context.app.service('devices').find({ query: { $limit: 1, beaconValues: detectedBeacon.values } })
        ]).then(devices => {
          scanningDevice = (devices[0].data ? devices[0].data : devices[0])[0];
          detectedDevice = (devices[1].data ? devices[1].data : devices[1])[0];
          if (!scanningDevice || !detectedDevice) {
            // If either of the devices is missing from the database it's either an error or there's nothing to do with them.
            throw new Error('Either the scanning device or the detected device are absent from the database.');
          } else if (scanningDevice._id.equals(detectedDevice._id)) {
            // It's natural that the scanning device is able to detect itself whenever you're using "external beacons".
            throw new Error('It\'s natural that the scanning device is capable of detecting itself.')
          } else {
            // This is the interesting situation. Both devices are in the database and the scanning device is detecting a different device.
            // Moreover, check if the detected device is also detecting the scanned device.
            return context.app.service('beacons').find({
              query: {
                $limit: 1,
                deviceUuid: detectedDevice.deviceUuid,
                'beacon.values': scanningDevice.beaconValues
              }
            })
          }
        }).then(beacons => {
          const beacon = (beacons.data ? beacons.data : beacons)[0];
          // Check if the scanning device's beacon has been detected by the detected device.
          if (beacon) {
            return context.app.service('events').create({
              event: 'proxemics',
              payload: {
                to: {
                  userId: context.params.user.email,
                  deviceUuid: scanningDevice.deviceUuid
                },
                type: 'enter',
                scanedDeviceUuid: scanningDevice.deviceUuid,
                detectedDeviceUuid: detectedDevice.deviceUuid,
                beacon: context.data.beacon
              }
            });
          }
        }).then(() => { return context; }).catch(e => { throw e; });
      /*
      case 'remove':
        if (context.result && context.result.length > 0) {
          return context.app.service('devices').find({ query: { $limit: 1, beaconValues: { $in: context.result[0].beacon.values } } })
            .then(results => {
              const device = (results.data ? results.data : results)[0];
              if (device) {
                return context.app.service('events').create({
                  event: 'proxemics',
                  payload: {
                    to: {
                      userId: context.params.user.email,
                      deviceUuid: context.params.query.deviceUuid,
                    },
                    type: 'exit',
                    data: device
                  }
                });
              }
            }).then(() => { return context; }).catch(e => { throw e; });
        }
        break;
        */
      default:
        return context;
    }
  } else return context;
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