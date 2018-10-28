// Initializes the `beacons` service on path `/beacons`
const createService = require('feathers-mongoose');
const createModel = require('../../models/beacons.model');
const hooks = require('./beacons.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  /* const paginate = app.get('paginate'); */

  const options = {
    Model,
    /* paginate */
  };

  // Initialize our service with any options it requires
  app.use('/beacons', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('beacons');

  service.hooks(hooks);
};
