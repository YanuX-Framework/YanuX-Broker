const { authenticate } = require('@feathersjs/authentication').hooks;
const checkEntityRead = require('../../hooks/authorization').checkEntityRead
const checkEntityWrite = require('../../hooks/authorization').checkEntityWrite

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [checkEntityWrite],
    update: [checkEntityWrite],
    patch: [checkEntityWrite],
    remove: [checkEntityWrite]
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