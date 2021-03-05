// Initializes the `events` service on path `/events`
const createService = require('./events.class.js');
const hooks = require('./events.hooks');

module.exports = function (app) {
  /* const paginate = app.get('paginate'); */

  const options = {
    /* paginate */
    /* multi: true */
  };

  const createdService = createService(options);
  createdService.docs = {
    description: 'A service to manage events',
    definitions: {
      events: {
        properties: {
          value: { type: 'object' },
          name: { type: 'string' },
          resource: { type: 'string' }
        }
      }
    }
  };

  // Initialize our service with any options it requires
  app.use('/events', createdService);
  // Get our initialized service so that we can register hooks
  const service = app.service('events');
  service.hooks(hooks);
};
