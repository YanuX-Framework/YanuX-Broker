const resources = require('./resources/resources.service.js');
const users = require('./users/users.service.js');
const beacons = require('./beacons/beacons.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  app.configure(users);
  // Broker Services
  app.configure(resources);
  // IPS Services
  app.configure(beacons);
};
