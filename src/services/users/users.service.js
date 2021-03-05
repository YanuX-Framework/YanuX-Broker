// Initializes the `users` service on path `/users`
const createService = require('feathers-mongoose');
const m2s = require('mongoose-to-swagger');
const createModel = require('../../models/users.model');
const hooks = require('./users.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  /* const paginate = app.get('paginate'); */

  const options = {
    Model,
    multi: true,
    /* paginate */
  };

  const createdService = createService(options);
  createdService.docs = {
    description: 'A service to manage users',
    definitions: {
      users: m2s(Model),
      users_list: {
        type: 'array',
        items: { $ref: '#/components/schemas/users' }
      }
    }
  };

  // Initialize our service with any options it requires
  app.use('/users', createdService);
  // Get our initialized service so that we can register hooks
  const service = app.service('users');
  service.hooks(hooks);
};
