const { authenticate } = require('@feathersjs/authentication').hooks;
const mongooseOptions = require('../../hooks/mongoose-options');
const { GeneralError } = require('@feathersjs/errors');

function clearInactive(context) {
  const cutOffDateTime = new Date(new Date().getTime() - context.app.get('beacons').maxInactivityTime);
  return context.service.remove(null, {
    query: { updatedAt: { $lt: cutOffDateTime } }
  }).then(() => context).catch(e => { throw e; })
}

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

function updateProxemics(context) {
  if (context.type !== 'after') { throw new GeneralError('This must be run as an \'after\' hook.') }
  if (context.method !== 'create' && context.method !== 'patch' && context.method !== 'update' && context.method !== 'remove') {
    return context;
  }

  if (context.data) {
    deviceUuid = context.data.deviceUuid;
    detectedBeacon = context.data.proximity.beacon;
  }
  if (context.params && context.params.query) {
    deviceUuid = deviceUuid || context.params.query.deviceUuid;
    detectedBeacon = detectedBeacon || context.params.proximity.beacon;
  }
  if (context.result && context.result.length > 0) {
    deviceUuid = deviceUuid || context.result[0].deviceUuid;
    detectedBeacon = detectedBeacon || context.result[0].proximity.beacon;
  }

  if (!deviceUuid || !detectedBeacon) {
    return context;
  }

  return new Promise((resolve, reject) => {
    //TODO: Check what I'm doing on ./beacons/beacon.hooks.js "updateProxemics" function for some inspiration.
    resolve(context);
  });
}


module.exports = {
  before: {
    all: [authenticate('jwt', 'yanux')/*, clearInactive */],
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
    create: [updateProxemics],
    update: [updateProxemics],
    patch: [updateProxemics],
    remove: [updateProxemics]
  }
};
