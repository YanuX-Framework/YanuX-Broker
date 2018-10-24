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

function afterCreateUpdatePatchAndRemove(context) {
  // TODO: Implement proxemics notifications.
  console.log('After Create, Update, Patch and Removed Called');
  // Only run the "meat" of this hook for external requests!
  if (context.params.provider &&
    context.params.payload &&
    context.params.payload.userId) {
    switch (context.method) {
      case 'create':
        const deviceUuid = context.data.deviceUuid;
        const beacon = context.data.beacon;
        return Promise.all([
          context.app.service('devices').find({ query: { $limit: 1, deviceUuid: deviceUuid } }),
          context.app.service('devices').find({ query: { $limit: 1, beaconValues: { $in: beacon.values } } })
        ]).then(devices => {
          const scanningDevice = (devices[0].data ? devices[0].data : devices[0])[0];
          const detectedDevice = (devices[1].data ? devices[1].data : devices[1])[0];
          if (!scanningDevice || !detectedDevice) {
            // If either of the devices is missing from the database it's either an error or there's nothing to do with them.
            throw new Error('Either the scanning device or the detected device are absent from the database.');
          } else if (!scanningDevice._id.equals(detectedDevice._id)) {
            // It's natural that the scanning device is able to detect itself whenever you're using "external beacons".
            // This is the interesting situation. Both the devices are in the database and the scanning device is detecting a different device.
            return context.app.service('beacons').find({ query: { $limit: 1, deviceUuid: detectedDevice.deviceUuid, 'beacon.values': { $in: scanningDevice.beaconValues } } })
          }
        }).then(result => {
          return context.app.service('events').create({
            event: 'proxemics',
            payload: {
              to: {
                userId: context.params.user.email,
                deviceUuid: scanningDevice.deviceUuid
              },
              deviceUuid: detectedDevice.deviceUuid,
              type: 'deviceFound',
              beacon: context.data.beacon
            }
          });
        }).then(() => { return context; }).catch(e => { throw e; });
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
                    type: 'deviceLost',
                    data: device
                  }
                });
              }
            }).then(() => { return context; }).catch(e => { throw e; });
        }
        break;
      case 'find':
      case 'get':
      default:
        return context;
    }
  } else {
    console.log('Internal Request');
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
    create: [afterCreateUpdatePatchAndRemove],
    update: [afterCreateUpdatePatchAndRemove],
    patch: [afterCreateUpdatePatchAndRemove],
    remove: [afterCreateUpdatePatchAndRemove]
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