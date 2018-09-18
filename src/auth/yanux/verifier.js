const Debug = require('debug');
const { omit } = require('lodash');
const request = require('request');
const debug = Debug('@feathersjs/authentication-local:yanux-auth:verify');
const { Conflict } = require("@feathersjs/errors");


class YanuxVerifier {
    constructor(app, options = {}) {
        this.app = app;
        this.options = options;
        this.service = typeof options.service === 'string' ? app.service(options.service) : options.service;
        if (!this.service) {
            throw new Error(`options.service does not exist.\n\tMake sure you are passing a valid service path or service instance and that it is initialized.`);
        }
        this._normalizeResult = this._normalizeResult.bind(this);
        this.verify = this.verify.bind(this);
    }

    _normalizeResult(results) {
        // Paginated services return the array of results in the data attribute.
        let entities = results.data ? results.data : results;
        let entity = entities[0];

        // Handle bad username.
        if (!entity) {
            return Promise.reject(false); // eslint-disable-line
        }

        debug(`${this.options.entity} found`);
        return Promise.resolve(entity);
    }

    verify(req, done) {
        debug('Checking if the provided access token is valid');
        const accessTokenKey = this.options.accessTokenKey;
        const authorizationHeader = this.options.authorizationHeader
        const accessToken = req.body[accessTokenKey] || (req.headers[authorizationHeader] ? req.headers[authorizationHeader].replace('Bearer ', '') : null)
        if (typeof accessToken !== 'string') {
            return done(new Error('The accessToken is missing from your authentication request.'));
        }
        request.get(this.options.url, { 'auth': { 'bearer': accessToken } },
            (err, httpResponse, body) => {
                if (err) {
                    return done(err);
                } else if (httpResponse.statusCode != 200) {
                    return done(new Error('The provided access token is not valid.'));
                } else {
                    const username = JSON.parse(body).response.user.email;
                    const id = this.service.id;
                    const usernameField = this.options.entityUsernameField || this.options.usernameField;
                    const reqParams = omit(req.params, 'query', 'provider', 'headers', 'session', 'cookies');
                    const params = Object.assign({
                        'query': {
                            [usernameField]: username,
                            '$limit': 1
                        }
                    }, reqParams);

                    if (id === null || id === undefined) {
                        debug('failed: the service.id was not set');
                        return done(new Error('the `id` property must be set on the entity service for authentication'));
                    }

                    const authenticationService = () =>
                        // Look up the entity
                        this.service.find(params)
                            .then(response => {
                                const results = response.data || response;
                                if (!results.length) {
                                    debug(`a record with ${usernameField} of '${username}' did not exist`);
                                }
                                return this._normalizeResult(response);
                            })
                            .then(entity => {
                                const id = entity[this.service.id];
                                const payload = { [`${this.options.entity}Id`]: id };
                                done(null, entity, payload);
                            }).catch(error => error ? done(error) : done(null, error, { message: 'Invalid login' }));
                    
                    const user = {};
                    user[usernameField] = username;
                    this.service.create(user, reqParams)
                        .then(authenticationService)
                        .catch(err => {
                            if (!(err instanceof Conflict)) {
                                done(err);
                            } else {
                                return authenticationService();
                            }
                        });
                }
            });
    }
}

module.exports = YanuxVerifier;