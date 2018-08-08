const Debug = require('debug');
const { merge, omit, pick } = require('lodash');
const DefaultVerifier = require('./verifier');

const passportCustom = require('passport-custom');

const debug = Debug('@yanux/broker:yanux-auth');
const defaults = {
    name: 'yanux',
    accessTokenKey: 'accessToken',
    authorizationHeader: 'authorization',
    usernameField: 'email'
};

const KEYS = [
    'entity',
    'service',
    'usernameField',
    'passReqToCallback',
    'session'
];

function init(options = {}) {
    return function yanuxAuth() {
        const app = this;
        const _super = app.setup;

        if (!app.passport) {
            throw new Error(`Can not find app.passport. Did you initialize feathers-authentication?`);
        }

        let name = options.name || defaults.name;
        let authOptions = app.get('authentication') || {};
        let yanuxOptions = authOptions[name] || {};

        // NOTE (EK): Pull from global auth config to support legacy auth for an easier transition.
        const yanuxSettings = merge({}, defaults, pick(authOptions, KEYS), yanuxOptions, omit(options, ['Verifier']));
        if (typeof yanuxSettings.url !== 'string') {
            throw new Error(`You must provide the URL of the verification endpoint in your authentication configuration or just pass the value explicitly.`);
        }

        let Verifier = DefaultVerifier;
        if (options.Verifier) {
            Verifier = options.Verifier;
        }
        app.setup = function () {
            let result = _super.apply(this, arguments);
            let verifier = new Verifier(app, yanuxSettings);
            if (!verifier.verify) {
                throw new Error(`Your verifier must implement a 'verify' function. It should have the same signature as a local passport verify callback.`);
            }
            // Register 'local' strategy with passport
            debug('Registering YanuX authentication strategy with options:', yanuxSettings);
            app.passport.use(yanuxSettings.name, new passportCustom.Strategy(verifier.verify.bind(verifier)));
            app.passport.options(yanuxSettings.name, yanuxSettings);
            return result;
        };
    };
}

module.exports = init;

// Exposed Modules
Object.assign(module.exports, {
    default: init,
    defaults,
    Verifier: DefaultVerifier
});