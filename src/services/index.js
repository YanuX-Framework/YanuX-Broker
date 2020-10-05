const users = require('./users/users.service.js');
const clients = require('./clients/clients.service.js');
const events = require('./events/events.service.js');
const resources = require('./resources/resources.service.js');
const resourceSubscriptions = require('./resource-subscriptions/resource-subscriptions.service.js');
const beacons = require('./beacons/beacons.service.js');
const instances = require('./instances/instances.service.js');
const devices = require('./devices/devices.service.js');
const proxemics = require('./proxemics/proxemics.service.js');
const beaconLogs = require('./beacon-logs/beacon-logs.service.js');

const location = require('./location/location.service.js');

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
  app.configure(resourceSubscriptions);
  // IPS Services
  // - Beacons service
  // - Instances service
  // - Devices service
  // - Proxemics service
  // - Beacon Logs service
  app.configure(beacons);
  app.configure(instances);
  app.configure(devices);
  app.configure(proxemics);
  app.configure(beaconLogs);
  app.configure(location);
};
