const { authenticate } = require('@feathersjs/authentication').hooks;
const errors = require('@feathersjs/errors');

function onAll(context) {
  if (context.params.payload
    && context.params.payload.clientId) {
    let params = { }
    if (context.id) {
      params = Object.assign(params, { query: { _id: context.id } }, context.params)
    } else {
      params = Object.assign(params, context.params)
    }
    /** 
     * TODO:
     * - Finish implementing validation logic.
     * - I also have YET to automatically create a client each time I login using an Access Token.
     * - There are probably more details to look after.
     */
    return context;
  }
  else {
    throw new errors.Forbidden('You are not allowed to access this resource.');
  }
}

module.exports = {
  before: {
    all: [authenticate('jwt'), onAll],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
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
