// Initializes the `proxemics` service on path `/proxemics`
const createService = require('feathers-mongoose');
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

  // Initialize our service with any options it requires
  app.use('/proxemics', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('proxemics');

  service.hooks(hooks);
};
