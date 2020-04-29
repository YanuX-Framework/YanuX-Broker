/**
 * TODO: 
 * This service was generated using a newer version of the Feathers CLI tool so the template is a bit different from the remaining services.
 * In the future, I should probably change the other services to fit this more moden styles.
 */
// Initializes the `resource-subscription` service on path `/resource-subscription`
const { ResourceSubscription } = require('./resource-subscriptions.class');
const createModel = require('../../models/resource-subscriptions.model');
const hooks = require('./resource-subscriptions.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    multi: true,
    /* paginate: app.get('paginate') */
  };

  // Initialize our service with any options it requires
  app.use('/resource-subscriptions', new ResourceSubscription(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('resource-subscriptions');

  service.hooks(hooks);
};
