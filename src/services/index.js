const resources = require('./resources/resources.service.js');
const users = require('./users/users.service.js');
const beacons = require('./beacons/beacons.service.js');
const events = require('./events/events.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  // Generic Services
  // - Users service
  // - Events service
  app.configure(users);
  app.configure(events);
  // Broker Services
  // - Resources service
  app.configure(resources);
  // IPS Services
  // - Beacons service
  app.configure(beacons);

};
