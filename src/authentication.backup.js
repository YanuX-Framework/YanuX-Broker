const path = require('path');
const fs = require('fs');
const authentication = require('@feathersjs/authentication');
const jwt = require('@feathersjs/authentication-jwt');
const local = require('@feathersjs/authentication-local');
const yanux = require('./auth/yanux');

module.exports = function (app) {
  const config = app.get('authentication');
  const privateKey = fs.readFileSync(path.join(__dirname,'..','keys','combined.pem'), 'utf8');
  config.secret = privateKey;
  // Set up authentication with the secret
  app.configure(authentication(config));
  app.configure(jwt());
  app.configure(local());
  app.configure(yanux());
  // The `authentication` service is used to create a JWT.
  // The before `create` hook registers strategies that can be used
  // to create a new valid JWT (e.g. local or oauth2)
  app.service('authentication').hooks({
    before: {
      create: [
        authentication.hooks.authenticate(config.strategies)
      ],
      remove: [
        authentication.hooks.
      ]
    }
  });
};
