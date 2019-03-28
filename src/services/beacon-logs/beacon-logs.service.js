// Initializes the `beaconLogs` service on path `/beacon-logs`
const createService = require('feathers-mongoose');
const createModel = require('../../models/beacon-logs.model');
const hooks = require('./beacon-logs.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  /* const paginate = app.get('paginate'); */

  const options = {
    Model,
    multi: true
    /* paginate */
  };

  // Initialize our service with any options it requires
  app.use('/beacon-logs', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('beacon-logs');

  service.hooks(hooks);
};
