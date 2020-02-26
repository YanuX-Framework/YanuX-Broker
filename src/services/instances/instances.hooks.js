const { v4: uuidv4 } = require('uuid');

const { authenticate } = require('@feathersjs/authentication').hooks;
const protect = require('@feathersjs/authentication-local').hooks.protect;

const canReadEntity = require('../../hooks/authorization').canReadEntity;
const canWriteEntity = require('../../hooks/authorization').canWriteEntity;

function beforeCreate(context) {
  if (context.data) {
    context.data.instanceUuid = context.data.instanceUuid || uuidv4();
  }
  return context;
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
      context.params._socket.on('disconnect', onDisconnect);
    }
    if (context.params.provider === 'primus') {
      context.params._socket.on('end', onDisconnect);
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
    all: [protect('user.password')],
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
