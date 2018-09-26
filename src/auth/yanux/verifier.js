const Debug = require('debug');
const { omit } = require('lodash');
const request = require('request');
const debug = Debug('@feathersjs/authentication-local:yanux-auth:verify');

class YanuxVerifier {
    constructor(app, options = {}) {
        this.app = app;
        this.options = options;
        this.usersService = typeof options.service === 'string' ? app.service(options.service) : options.service;
        if (!this.usersService) {
            throw new Error(`options.service does not exist.\n\tMake sure you are passing a valid service path or service instance and that it is initialized.`);
        }
        this.clientsService = typeof options.clientsService === 'string' ? app.service(options.clientsService) : options.clientsService;
        if (!this.usersService) {
            throw new Error(`options.clientsService does not exist.\n\tMake sure you are passing a valid service path or service instance and that it is initialized.`);
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
            return done(new Error('The Access Token is missing from your authentication request.'));
        }

        const clientIdField = this.options.clientIdField;
        const clientIdKey = this.options.clientIdKey;
        const clientId = req.body[clientIdKey];
        if (typeof clientId !== 'string') {
            return done(new Error('The Client ID is missing from your authentication request.'));
        }

        request.get(this.options.url, { 'auth': { 'bearer': accessToken } },
            (err, httpResponse, body) => {
                if (err) {
                    return done(err);
                } else if (httpResponse.statusCode != 200) {
                    return done(new Error('The provided access token is not valid.'));
                } else {
                    const verification = JSON.parse(body);
                    if (verification.response.client.id !== clientId) {
                        return done(new Error('The Acess Token is not valid for the Client ID that you provided.'));
                    }
                    const username = verification.response.user.email;
                    const id = this.usersService.id;
                    if (id === null || id === undefined) {
                        debug('failed: the service.id was not set');
                        return done(new Error('the `id` property must be set on the entity service for authentication'));
                    }

                    const usernameField = this.options.entityUsernameField || this.options.usernameField;
                    const reqParams = omit(req.params, 'query', 'provider', 'headers', 'session', 'cookies');

                    const userParams = Object.assign({
                        'query': {
                            [usernameField]: username,
                            '$limit': 1
                        }
                    }, reqParams);

                    const clientParams = Object.assign({
                        'query': {
                            [clientIdField]: clientId,
                            '$limit': 1
                        }
                    }, reqParams);

                    Promise.all([
                        this.usersService.find(userParams),
                        this.clientsService.find(clientParams)
                    ]).then(responses => {
                        const promises = [];
                        const userResults = responses[0].data || responses[0];
                        const clientResults = responses[1].data || responses[1];
                        if (!userResults.length) {
                            promises.push(this.usersService.create({
                                [usernameField]: username
                            }));
                        } else {
                            promises.push(this._normalizeResult(userResults));
                        }
                        if (!clientResults.length) {
                            promises.push(this.clientsService.create({
                                [clientIdField]: clientId
                            }));
                        } else {
                            promises.push(this._normalizeResult(clientResults));
                        }
                        return Promise.all(promises);
                    }).then(entities => {
                        const payload = {
                            [`${this.options.entity}Id`]: entities[0][this.usersService.id],
                            [clientIdKey]: entities[1][this.clientsService.id]
                        };
                        done(null, entities[0], payload);
                    }).catch(error => {
                        if(error){
                            done(error)
                        } else {
                            done(null, error, { message: 'Invalid login' });
                        }
                    });
                }
            });
    }
}

module.exports = YanuxVerifier;