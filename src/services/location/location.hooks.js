const { authenticate } = require('@feathersjs/authentication').hooks;
const mongooseOptions = require('../../hooks/mongoose-options');
const { GeneralError } = require('@feathersjs/errors');

function beforePatchUpdate(context) {
  if (context.data && context.params.query) {
    const location = context.data;
    return context.service.find({ query: context.params.query, paginate: false })
      .then(locations => {
        const locationTimestamp = new Date(location.timestamp);
        if (locations.every(l => locationTimestamp >= l.timestamp)) {
          return context;
        } else { throw new GeneralError('The new location\'s timestamp is older than the one(s) already stored.'); }
      }).catch(e => { throw e; });
  }
}

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [],
    update: [beforePatchUpdate, mongooseOptions({ upsert: true })],
    patch: [beforePatchUpdate, mongooseOptions({ upsert: true })],
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
