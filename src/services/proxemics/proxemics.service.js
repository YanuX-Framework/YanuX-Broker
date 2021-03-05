// Initializes the `proxemics` service on path `/proxemics`
const createService = require('feathers-mongoose');
const m2s = require('mongoose-to-swagger');
const createModel = require('../../models/proxemics.model');
const hooks = require('./proxemics.hooks');

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
    description: 'A service to manage proxemics',
    definitions: {
      proxemics: m2s(Model),
      proxemics_list: {
        type: 'array',
        items: { $ref: '#/components/schemas/proxemics' }
      }
    }
  };

  // Initialize our service with any options it requires
  app.use('/proxemics', createdService);

  // Get our initialized service so that we can register hooks
  const service = app.service('proxemics');

  service.hooks(hooks);
};
