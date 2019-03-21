const { authenticate } = require('@feathersjs/authentication').hooks;
const socketio = require('@feathersjs/socketio')
const primus = require('@feathersjs/primus')
const uuidv4 = require('uuid/v4');

const protect = require('@feathersjs/authentication-local').hooks.protect;

function beforeCreate(context) {
  if (context.data) {
    context.data.instanceUuid = context.data.instanceUuid || uuidv4();
  }
}

function afterCreate(context) {
  if (context.data
    && context.params
    && context.params.connection) {
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
    return context.app.service('devices').get(context.data.device)
      .then(device => {
        context.app.channel(`instances/${context.result._id}`).join(context.params.connection);
        context.app.channel(`instances/${context.result.instanceUuid}`).join(context.params.connection);

        context.app.channel(`users/${context.params.user._id}/instances/${context.result._id}`).join(context.params.connection);
        context.app.channel(`users/${context.params.user.email}/instances/${context.data.instanceUuid}`).join(context.params.connection);

        context.app.channel(`users/${context.params.user._id}/devices/${device._id}`).join(context.params.connection);
        context.app.channel(`users/${context.params.user.email}/devices/${device.deviceUuid}`).join(context.params.connection);

        context.app.channel(`users/${context.params.user._id}/devices/${device._id}/instances/${context.result._id}`).join(context.params.connection);
        context.app.channel(`users/${context.params.user.email}/devices/${device.deviceUuid}/instances/${context.result.instanceUuid}`).join(context.params.connection);
        return context;
      }).catch(e => { throw e });
  } else {
    return context;
  }
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
    all: [
      // Make sure the user's password field is never sent to the client
      // Always must be the last hook
      protect('user.password')],
    find: [],
    get: [],
    create: [afterCreate],
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
