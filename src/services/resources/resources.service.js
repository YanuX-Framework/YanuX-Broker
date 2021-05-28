// Initializes the `resources` service on path `/resources`
const createService = require('feathers-mongoose');
const m2s = require('mongoose-to-swagger');
const createModel = require('../../models/resources.model');
const hooks = require('./resources.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  /* const paginate = app.get('paginate'); */

  const options = {
    Model,
    multi: true,
    whitelist: [ '$populate' ]
    /* paginate */
  };

  const createdService = createService(options);
  createdService.docs = {
    description: 'A service to manage resources',
    definitions: {
      resources: m2s(Model),
      resources_list: {
        type: 'array',
        items: { $ref: '#/components/schemas/resources' }
      }
    }
  };

  // Initialize our service with any options it requires
  app.use('/resources', createdService);
  // Get our initialized service so that we can register hooks
  const service = app.service('resources');
  service.hooks(hooks);
};
