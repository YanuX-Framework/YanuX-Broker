const { authenticate } = require('@feathersjs/authentication').hooks;
const uuidv4 = require('uuid/v4');

const protect = require('@feathersjs/authentication-local').hooks.protect;
const canReadEntity = require('../../hooks/authorization').canReadEntity
const canWriteEntity = require('../../hooks/authorization').canWriteEntity

function beforeCreate(context) {
  if (context.data) {
    context.data.instanceUuid = context.data.instanceUuid || uuidv4();
  }
}

function afterCreate(context) {
  if (context.data && context.params && context.params.connection) {
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
      context.params.socket.on('disconnect', onDisconnect);
    }
    /**
     * TODO: Test if this works with a Primus-based client!
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
    all: [authenticate('jwt', 'yanux')],
    find: [],
    get: [],
    create: [canWriteEntity, beforeCreate],
    update: [canWriteEntity],
    patch: [canWriteEntity],
    remove: [canWriteEntity]
  },
  after: {
    all: [
      // Make sure the user's password field is never sent to the client
      // Always must be the last hook
      protect('user.password')],
    find: [canReadEntity],
    get: [canReadEntity],
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
