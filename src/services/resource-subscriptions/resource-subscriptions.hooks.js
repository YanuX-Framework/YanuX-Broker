const { authenticate } = require('@feathersjs/authentication').hooks;

const canReadEntity = require('../../hooks/authorization').canReadEntity;
const canWriteEntity = require('../../hooks/authorization').canWriteEntity;
const mongooseOptions = require('../../hooks/mongoose-options');

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [canWriteEntity],
    update: [canWriteEntity, mongooseOptions({ upsert: true })],
    patch: [canWriteEntity, mongooseOptions({ upsert: true })],
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
