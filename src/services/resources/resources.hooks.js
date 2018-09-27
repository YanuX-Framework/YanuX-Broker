const { authenticate } = require('@feathersjs/authentication').hooks;
const checkEntityRead = require('../../hooks/authorization').checkEntityRead
const checkEntityOwnership = require('../../hooks/authorization').checkEntityOwnership

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [checkEntityOwnership],
    update: [checkEntityOwnership],
    patch: [checkEntityOwnership],
    remove: [checkEntityOwnership]
  },
  after: {
    all: [],
    find: [checkEntityRead],
    get: [checkEntityRead],
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