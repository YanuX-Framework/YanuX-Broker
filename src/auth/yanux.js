/**
 * NOTE: Loosely based on these:
 * https://docs.feathersjs.com/guides/auth/recipe.custom-auth-strategy.html
 * https://github.com/feathersjs/authentication-local/blob/master/lib/index.js
 */
const { merge } = require('lodash');
const CustomStrategy = require('passport-custom');

const defaults = {
    name: 'yanux',
    url: 'http://localhost'
};

const verifier = (req, done) => {
    console.debug('YanuX Auth Verifier Called!');
    return done(null, false);
};

const init = (options = {}) => {
    return function () {
        const app = this;
        let name = options.name || defaults.name;
        let authOptions = app.get('authentication') || {};
        let localOptions = authOptions[name] || {};
        const localSettings = merge({}, defaults, localOptions);
        if(!localSettings.url) {
            throw new Error(`options.url is missing.`);
        }
        // register the strategy in the app.passport instance
        this.passport.use('yanux', new CustomStrategy(verifier));
        // Add options for the strategy
        this.passport.options('yanux', {});
    };
};

module.exports = init;
Object.assign(module.exports, {
    default: init,
    defaults
});

