/**
 * NOTE: Loosely based on these:
 * https://docs.feathersjs.com/guides/auth/recipe.custom-auth-strategy.html
 * https://github.com/feathersjs/authentication-local/blob/master/lib/index.js
 */
const { merge } = require('lodash');
const request = require('request');
const CustomStrategy = require('passport-custom');
const defaults = {
    name: 'yanux',
    accessTokenKey: 'accessToken',
    authorizationHeader: 'authorization'
};

const init = (options = {}) => {
    return function () {
        const app = this;

        let name = options.name || defaults.name;
        let accessTokenKey = options.accessTokenKey || defaults.accessTokenKey;
        let authorizationHeader = options.authorizationHeader || defaults.authorizationHeader;

        let authOptions = app.get('authentication') || {};
        let localOptions = authOptions[name] || {};
        const yanuxSettings = merge({}, defaults, localOptions);

        if (typeof yanuxSettings.url !== 'string') {
            throw new Error(`You must provide the 'url' of your OAuth2 verification endpoint in your authentication configuration or just pass the value explicitly`);
        }
        // register the strategy in the app.passport instance
        this.passport.use('yanux', new CustomStrategy((req, done) => {
            console.debug('YanuX Auth Verifier Called!');
            let accessToken = req.body[accessTokenKey] || (req.headers[authorizationHeader] ? req.headers[authorizationHeader].replace('Bearer ', '') : null)
            if (typeof accessToken !== 'string') {
                return done(new Error('The accessToken is missing from your authentication request.'));
            } else {
                request.get(yanuxSettings.url, { 'auth': { 'bearer': accessToken } },
                    (err, httpResponse, body) => {
                        if (err) {
                            return done(err);
                        } else if (httpResponse.statusCode != 200) {
                            return done(new Error('The access token you provided is not valid.'));
                        } else {
                            console.log('YanuX Auth Response!');
                            const verificationRes = JSON.parse(body);
                            const authenticationService = () =>
                                app.service('users').find({ query: { email: verificationRes.response.user.email } })
                                    .then(users => {
                                        if (users.length === 1) {
                                            const id = users[0][app.service.id];
                                            const payload = { [`userId`]: id };
                                            done(null, users[0], payload);
                                        } else {
                                            return done(null, false);
                                        }
                                    });
                            app.service('users').create({ email: verificationRes.response.user.email })
                                .then(authenticationService)
                                .catch(authenticationService);
                        }
                    });
            }
        }));
        // Add options for the strategy
        this.passport.options('yanux', {});
    };
};

module.exports = init;
Object.assign(module.exports, {
    default: init,
    defaults
});

