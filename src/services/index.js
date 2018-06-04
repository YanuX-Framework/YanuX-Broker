const resources = require('./resources/resources.service.js');
const users = require('./users/users.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  app.configure(resources);
  app.configure(users);
};
