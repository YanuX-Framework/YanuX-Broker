const { authenticate } = require('@feathersjs/authentication').hooks;

const canReadEntity = require('../../hooks/authorization').canReadEntity
const canWriteEntity = require('../../hooks/authorization').canWriteEntity

module.exports = {
  before: {
    all: [authenticate('jwt', 'yanux')],
    find: [],
    get: [],
    create: [canWriteEntity],
    update: [canWriteEntity],
    patch: [canWriteEntity],
    remove: [canWriteEntity]
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
