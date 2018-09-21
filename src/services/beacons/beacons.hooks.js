const { authenticate } = require('@feathersjs/authentication').hooks;

function beforeCreate(context) {
  if (context.params.user
    && context.data.beaconKey
    && context.data.deviceId) {
    const user = context.params.user;
    const beaconkey = context.data.beaconKey;
    const deviceId = context.data.deviceId;
    return this.remove(null, {
      query: {
        user: user._id,
        deviceId: deviceId,
        beaconKey: beaconkey
      }
    }).then(beacon => {
      return context;
    }).catch(e => {
      throw e;
    });
  }
}

function beforePatchAndUpdate(context) {
  if (context.data.beacon
    && context.params.query) {
    const beacon = context.data.beacon;
    const query = context.params.query;
    return this.find({ query: query, paginate: false })
      .then(beacons => {
        if (beacons.every(b => beacon.timestamp > b.beacon.timestamp)) {
          return context;
        } else {
          throw new Error('The new beacon\'s timestamp is older than the one(s) already stored.');
        }
      })
      .catch(e => {
        throw e
      });
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
            deviceId: context.data.deviceId,
            status: 'deviceSeen',
          }
        })
        .then(event => {return;})
        .catch(e => {throw e});
        break;
      case 'remove':
        context.app.service('events').create({
          event: 'proxemics',
          payload: {
            userId: context.params.user.email,
            deviceId: context.params.query.deviceId,
            status: 'deviceLost',
          }
        })
        .then(event => {return;})
        .catch(e => {throw e});
        break;
      case 'find':
      case 'get':
      case 'update':
      case 'patch':
      default:
        break;
    }
  } else {
    console.log('Internal Affairs');
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