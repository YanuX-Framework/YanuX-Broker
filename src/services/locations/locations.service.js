// Initializes the `locations` service on path `/locations`
const m2s = require('mongoose-to-swagger');
const { Locations } = require('./locations.class');
const createModel = require('../../models/locations.model');
const hooks = require('./locations.hooks');

module.exports = function (app) {
  const createdModel = createModel(app);

  const options = {
    Model: createdModel,
    multi: true,
    whitelist: ['$exists']
    /* paginate: app.get('paginate') */
  };

  const createdService = new Locations(options, app);
  createdService.docs = {
    description: 'A service to manage information about positions and locations',
    definitions: {
      locations: m2s(createdModel),
      locations_list: {
        type: 'array',
        items: { $ref: '#/components/schemas/locations' }
      }
    }
  };

  // Initialize our service with any options it requires
  app.use('/locations', createdService);

  // Get our initialized service so that we can register hooks
  const service = app.service('locations');

  service.hooks(hooks);
};
