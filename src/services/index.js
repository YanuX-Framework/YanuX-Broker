const resources = require('./resources/resources.service.js');
const users = require('./users/users.service.js');
const beacons = require('./beacons/beacons.service.js');
const events = require('./events/events.service.js');
const clients = require('./clients/clients.service.js');
const instances = require('./instances/instances.service.js');
const devices = require('./devices/devices.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  // Generic Services
  // - Users service
  // - Clients service
  // - Events service
  app.configure(users);
  app.configure(clients);
  app.configure(events);
  // Broker Services
  // - Resources service
  app.configure(resources);
  // IPS Services
  // - Beacons service
  // - Instances service
  // - Devices service
  app.configure(beacons);
  app.configure(instances);
  app.configure(devices);
};
