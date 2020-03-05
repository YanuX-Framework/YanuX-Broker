const { JWTStrategy } = require('@feathersjs/authentication');
const { YanuxAuthenticationService, YanuxStrategy } = require('./auth/yanux');

const { LocalStrategy } = require('@feathersjs/authentication-local');
const { expressOauth } = require('@feathersjs/authentication-oauth');

module.exports = app => {
  app.set('authentication', app.get('authentication'));
  
  const authentication = new YanuxAuthenticationService(app);

  authentication.register('jwt', new JWTStrategy());
  authentication.register('local', new LocalStrategy());
  authentication.register('yanux', new YanuxStrategy());

  app.use('/authentication', authentication);
  app.configure(expressOauth());
};
