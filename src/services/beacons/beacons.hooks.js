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
  if (context.params.provider) {
    switch (context.method) {
      case 'create':
        context.app.service('events').create({
          event: 'proxemics',
          payload: {
            userId: context.params.user.email,
            deviceUuid: context.data.deviceUuid,
            type: 'beaconSeen',
            data: context.data
          }
        }).then(e => { return context; })
          .catch(e => { throw e; });
        break;
      case 'remove':
        context.app.service('events').create({
          event: 'proxemics',
          payload: {
            userId: context.params.user.email,
            deviceUuid: context.params.query.deviceUuid,
            type: 'beaconLost',
            data: context.result[0]
          }
        }).then(e => { return context; })
          .catch(e => { throw e; });
        break;
      case 'find':
      case 'get':
      case 'update':
      case 'patch':
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