// Initializes the `locations` service on path `/locations`
const { locations } = require('./locations.class');
const createModel = require('../../models/locations.model');
const hooks = require('./locations.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    multi: true,
    /* paginate: app.get('paginate') */
  };

  // Initialize our service with any options it requires
  app.use('/locations', new locations(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('locations');

  service.hooks(hooks);
};
