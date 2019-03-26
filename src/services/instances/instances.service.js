// Initializes the `instances` service on path `/instances`
const createService = require('feathers-mongoose');
const createModel = require('../../models/instances.model');
const hooks = require('./instances.hooks');

module.exports = function (app) {
  const Model = createModel(app);
  /* const paginate = app.get('paginate'); */

  const options = {
    Model,
    multi: true,
    whitelist: [ '$populate' ]
    /* paginate */
  };

  // Initialize our service with any options it requires
  app.use('/instances', createService(options));

  // Get our initialized service so that we can register hooks
  const service = app.service('instances');

  service.hooks(hooks);

  service.remove(null, { query: { brokerName: app.get('name') } })
  .then(res => console.log(`Removed all outstanding instances belonging to ${app.get('name')}:`, res))
  .catch(e => console.log(`Failed to remove outstanding instances belonging to ${app.get('name')}:`, e));
};
