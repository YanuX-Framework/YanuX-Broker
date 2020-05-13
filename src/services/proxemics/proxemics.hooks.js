const { authenticate } = require('@feathersjs/authentication').hooks;

const canReadEntity = require('../../hooks/authorization').canReadEntity;
const canWriteEntity = require('../../hooks/authorization').canWriteEntity;

const prevSharedWithBefore = require('../../hooks/prev-shared-with').prevSharedWithBefore;
const prevSharedWithAfter = require('../../hooks/prev-shared-with').prevSharedWithAfter;

module.exports = {
  before: {
    all: [authenticate('jwt', 'yanux')],
    find: [],
    get: [],
    create: [canWriteEntity],
    update: [canWriteEntity, prevSharedWithBefore],
    patch: [canWriteEntity, prevSharedWithBefore],
    remove: [canWriteEntity]
  },

  after: {
    all: [],
    find: [canReadEntity],
    get: [canReadEntity],
    create: [],
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
