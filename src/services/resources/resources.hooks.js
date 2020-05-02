const { authenticate } = require('@feathersjs/authentication').hooks;
const { Forbidden } = require('@feathersjs/errors');

const canReadEntity = require('../../hooks/authorization').canReadEntity;
const canWriteEntity = require('../../hooks/authorization').canWriteEntity;


const isOwnerEditing = context => {
  if (!context.data || !context.data.data) {
    return canWriteEntity(context, false).then(context => context).catch(e => {
      throw new Forbidden('Shared access to the resource is not enough to peform this operation.');
    });
  } { return context; }
}

module.exports = {
  before: {
    all: [authenticate('jwt', 'yanux')],
    find: [],
    get: [],
    create: [canWriteEntity],
    update: [canWriteEntity, isOwnerEditing],
    patch: [canWriteEntity, isOwnerEditing],
    remove: [canWriteEntity, isOwnerEditing]
  },
  after: {
    all: [],
    find: [canReadEntity],
    get: [canReadEntity],
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