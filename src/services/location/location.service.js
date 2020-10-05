// Initializes the `location` service on path `/location`
const { Location } = require('./location.class');
const createModel = require('../../models/location.model');
const hooks = require('./location.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    multi: true,
    /* paginate: app.get('paginate') */
  };

  // Initialize our service with any options it requires
  app.use('/location', new Location(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('location');

  service.hooks(hooks);
};
