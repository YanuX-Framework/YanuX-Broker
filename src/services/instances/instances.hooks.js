const { v4: uuidv4 } = require('uuid');

const { authenticate } = require('@feathersjs/authentication').hooks;
const protect = require('@feathersjs/authentication-local').hooks.protect;

const canReadEntity = require('../../hooks/authorization').canReadEntity;
const canWriteEntity = require('../../hooks/authorization').canWriteEntity;

const prevSharedWithBefore = require('../../hooks/prev-shared-with').prevSharedWithBefore;
const prevSharedWithAfter = require('../../hooks/prev-shared-with').prevSharedWithAfter;

function beforeCreate(context) {
  if (context.data) {
    context.data.instanceUuid = context.data.instanceUuid || uuidv4();
  }
  return context;
}

function afterCreate(context) {
  if (context.result && context.result._id) {
    const onDisconnect = () => {
      context.service
        .remove(context.result._id)
        .then(instances => console.log('Removed Instances:', instances))
        .catch(e => console.error('Failed to Remove Instances:', e));
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
    update: [canWriteEntity, prevSharedWithBefore],
    patch: [canWriteEntity, prevSharedWithBefore],
    remove: [canWriteEntity]
  },
  after: {
    all: [protect('user.password')],
    find: [canReadEntity],
    get: [canReadEntity],
    create: [afterCreate],
    update: [prevSharedWithAfter],
    patch: [prevSharedWithAfter],
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
