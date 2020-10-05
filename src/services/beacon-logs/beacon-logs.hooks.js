const { authenticate } = require('@feathersjs/authentication').hooks;
const { disallow } = require('feathers-hooks-common');

function clearInactive(context) {
  /** 
   * TODO: This clean-up procedure could probably be "bootstraped" into other hooks so that it is run even when there's no beacon detection activity. 
   * Is it worth it though?
   **/
  //if (context.method !== 'remove') {
  const cutOffDateTime = new Date(new Date().getTime() - context.app.get('beacons').maxInactivityTime);
  return context.service.remove(null, {
    query: { updatedAt: { $lt: cutOffDateTime } }
  }).then(() => context).catch(e => { throw e; })
  //} else { return context; }
}

function aggregation(context) {
  if ('_aggregate' in context.params.query) {
    context.result = context.service.Model.aggregate(context.params.query._aggregate);
  }
  return context;
}

module.exports = {
  before: {
    all: [disallow('external'), authenticate('jwt', 'yanux'), clearInactive],
    find: [aggregation],
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
