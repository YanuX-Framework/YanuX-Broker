const path = require('path');
const fs = require('fs');

const { JWTStrategy } = require('@feathersjs/authentication');
const { YanuxAuthenticationService, YanuxStrategy } = require('./auth/yanux');

const { LocalStrategy } = require('@feathersjs/authentication-local');
const { expressOauth } = require('@feathersjs/authentication-oauth');

module.exports = app => {
  const config = app.get('authentication');
  const privateKey = fs.readFileSync(path.join(__dirname,'..','keys','combined.pem'), 'utf8');
  config.secret = privateKey;
  app.set('authentication', config);
  
  const authentication = new YanuxAuthenticationService(app);

  authentication.register('jwt', new JWTStrategy());
  authentication.register('local', new LocalStrategy());
  authentication.register('yanux', new YanuxStrategy());

  app.use('/authentication', authentication);
  app.configure(expressOauth());
};
