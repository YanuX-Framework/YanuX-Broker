const { authenticate } = require('@feathersjs/authentication').hooks;
const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;
const { disallow } = require('feathers-hooks-common');

const canReadEntity = require('../../hooks/authorization').canReadEntity
const canWriteEntity = require('../../hooks/authorization').canWriteEntity

module.exports = {
  before: {
    all: [],
    find: [authenticate('jwt', 'yanux')],
    get: [authenticate('jwt', 'yanux')],
    create: [disallow('external'), /*canWriteEntity,*/ hashPassword('password')],
    update: [disallow('external'), canWriteEntity, hashPassword('password'), authenticate('jwt', 'yanux')],
    patch: [disallow('external'), canWriteEntity, hashPassword('password'), authenticate('jwt', 'yanux')],
    remove: [disallow('external'), canWriteEntity, authenticate('jwt', 'yanux')]
  },

  after: {
    all: [
      // Make sure the password field is never sent to the client
      // Always must be the last hook
      protect('password')
    ],
    find: [/*canReadEntity*/],
    get: [/*canReadEntity*/],
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
