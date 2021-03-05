// Initializes the `beacons` service on path `/beacons`
const createService = require('feathers-mongoose');
const m2s = require('mongoose-to-swagger');
const createModel = require('../../models/beacons.model');
const hooks = require('./beacons.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  /* const paginate = app.get('paginate'); */

  const options = {
    Model,
    multi: true
    /* paginate */
  };

  const createdService = createService(options);
  createdService.docs = {
    description: 'A service to manage information about beacons (deprecated: locations are now used instead)',
    definitions: {
      beacons: m2s(Model),
      beacons_list: {
        type: 'array',
        items: { $ref: '#/components/schemas/beacons' }
      }
    }
  };

  // Initialize our service with any options it requires
  app.use('/beacons', createdService);
  // Get our initialized service so that we can register hooks
  const service = app.service('beacons');
  service.hooks(hooks);
};
