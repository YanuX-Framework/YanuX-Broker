const { authenticate } = require('@feathersjs/authentication').hooks;
const socketio = require('@feathersjs/socketio')
const primus = require('@feathersjs/primus')
const uuidv4 = require('uuid/v4');

function beforeCreate(context) {
  if (context.data &&
    context.params &&
    context.params.connection) {
    context.data.instanceUuid = context.data.instanceUuid || uuidv4();

    const instanceChannel = context.app.channel(`users/${context.params.user.email}/instances/${context.params.query.deviceUuid}`);
    instanceChannel.join(context.params.connection);

    const onDisconnect = () => {
      context.service.remove(null, {
        query: {
          user: context.data.user,
          client: context.data.client,
          device: context.data.device,
          instanceUuid: context.data.instanceUuid
        }
      }).then(instances => context.app.debug('Removed Instances:', instances))
        .catch(e => context.app.error('Failed to Remove Instances:', e));
    }

    if (context.params.provider === 'socketio') {
      const connection = context.params.connection[socketio.SOCKET_KEY];
      connection.on('disconnect', onDisconnect);
    }
    /**
     * TODO:
     * Test if this works with a Primus-based client!
     */
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
