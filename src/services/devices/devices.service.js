// Initializes the `devices` service on path `/devices`
const createService = require('feathers-mongoose');
const m2s = require('mongoose-to-swagger');
const createModel = require('../../models/devices.model');
const hooks = require('./devices.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  /* const paginate = app.get('paginate'); */

  const options = {
    Model,
    multi: true,
    whitelist: ['$populate']
    /* paginate */
  };

  const createdService = createService(options);
  createdService.docs = {
    description: 'A service to manage devices',
    definitions: {
      devices: m2s(Model),
      devices_list: {
        type: 'array',
        items: { $ref: '#/components/schemas/devices' }
      }
    }
  };

  // Initialize our service with any options it requires
  app.use('/devices', createdService);
  // Get our initialized service so that we can register hooks
  const service = app.service('devices');
  service.hooks(hooks);
};
