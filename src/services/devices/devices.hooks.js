const { authenticate } = require('@feathersjs/authentication').hooks;

function afterPatch(context) {
  if (context.method === 'patch' &&
    context.params.user &&
    context.params.query &&
    context.params.query.deviceUuid) {
    if (context.params.connection && context.data) {
      const userChannel = context.app.channel(`users/${context.params.user.email}`);
      if (userChannel.connections.find(connection => connection === context.params.connection)) {
        const userDeviceChannel = context.app.channel(`users/${context.params.user.email}/devices/${context.params.query.deviceUuid}`);
        userDeviceChannel.join(context.params.connection);
      }
      const deviceChannel = context.app.channel(`devices/${context.params.query.deviceUuid}`)
      deviceChannel.join(context.params.connection);
    }
    if (!context.result.length) {
      return context.service.create(context.data)
        .then(device => {
          context.result = [device];
          return context;
        }).catch(e => { throw e });
    }
  }
}

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [afterPatch],
    remove: []
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
