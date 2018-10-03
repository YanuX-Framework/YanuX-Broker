const { authenticate } = require('@feathersjs/authentication').hooks;

function onPatch(context) {
  if (context.method === 'patch' &&
    context.params.query &&
    context.params.query.deviceUuid) {
    if (context.params.connection && context.data) {
      if (context.data.status === 'online') {
        context.app.channel(`devices/${context.params.query.deviceUuid}`)
          .join(context.params.connection);
      } else if (context.data.status === 'offline') {
        context.app.channel(`devices/${context.params.query.deviceUuid}`)
          .leave(context.params.connection);
      }
    }
    if (!context.result.length)
      return context.service.create(context.data)
        .then(device => {
          context.result = [device];
          return context;
        }).catch(e => { throw e });
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
    patch: [onPatch],
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
