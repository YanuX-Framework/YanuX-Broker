/**
 * TODO: 
 * This service was generated using a newer version of the Feathers CLI tool so the template is a bit different from the remaining services.
 * In the future, I should probably change the other services to fit this more moden styles.
 */
// Initializes the `resource-subscription` service on path `/resource-subscription`
const m2s = require('mongoose-to-swagger');
const { ResourceSubscription } = require('./resource-subscriptions.class');
const createModel = require('../../models/resource-subscriptions.model');
const hooks = require('./resource-subscriptions.hooks');

module.exports = function (app) {
  const createdModel = createModel(app);
  const options = {
    Model: createdModel,
    multi: true,
    /* paginate: app.get('paginate') */
  };

  const createdService = new ResourceSubscription(options, app);
  createdService.docs = {
    description: 'A service to manage resource subscriptions',
    definitions: {
      'resource-subscriptions': m2s(createdModel),
      'resource-subscriptions_list': {
        type: 'array',
        items: { $ref: '#/components/schemas/resource-subscriptions' }
      }
    }
  };

  // Initialize our service with any options it requires
  app.use('/resource-subscriptions', createdService);
  // Get our initialized service so that we can register hooks
  const service = app.service('resource-subscriptions');
  service.hooks(hooks);
};
