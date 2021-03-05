// Initializes the `clients` service on path `/clients`
const createService = require('feathers-mongoose');
const m2s = require('mongoose-to-swagger');
const createModel = require('../../models/clients.model');
const hooks = require('./clients.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  /* const paginate = app.get('paginate'); */

  const options = {
    Model,
    multi: true
    /* paginate */
  };

  const createdService = createService(options);
  const schema = m2s(Model);
  schema.properties = {
    id: { type: 'string' },
    ...schema.properties
  }
  createdService.docs = {
    description: 'A service to manage client applications',
    definitions: {
      clients: schema,
      clients_list: {
        type: 'array',
        items: { $ref: '#/components/schemas/clients' }
      }
    }
  };

  // Initialize our service with any options it requires
  app.use('/clients', createdService);

  // Get our initialized service so that we can register hooks
  const service = app.service('clients');

  service.hooks(hooks);
};
