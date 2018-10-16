const { authenticate } = require('@feathersjs/authentication').hooks;
const socketio = require('@feathersjs/socketio')
const primus = require('@feathersjs/primus')

function beforeCreate(context) {
  if (context.data &&
    context.params &&
    context.params.connection) {
    const onDisconnect = () => {
      context.service.remove(null, {
        query: {
          user: context.data.user,
          client: context.data.client,
          device: context.data.device
        }
      }).then(instances => context.app.debug('Removed Instances:', instances))
        .catch(e => context.app.error('Failed to Remove Instances:', e));
    }
    if (context.params.provider === 'socketio') {
      const connection = context.params.connection[socketio.SOCKET_KEY];
      connection.on('disconnect', onDisconnect);
    }
    /** TODO: Test if this works with a Primus-based client. */
    if (context.params.provider === 'primus') {
      const connection = context.params.connection[primus.SOCKET_KEY];
      connection.on('end', onDisconnect);
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
    patch: [],
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
