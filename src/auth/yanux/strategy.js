const Debug = require('debug');
const debug = Debug('@feathersjs/authentication-local:yanux-auth:verify');
const { AuthenticationBaseStrategy } = require('@feathersjs/authentication')
const { NotAuthenticated } = require('@feathersjs/errors');
const request = require('request');

module.exports = class YanuxStrategy extends AuthenticationBaseStrategy {
    verifyConfiguration() {
        const config = this.configuration;
        [
            'url',
            'usernameField',
            'clientsService',
            'clientEntity',
            'clientIdField'
        ].forEach(prop => {
            if (typeof config[prop] !== 'string') {
                throw new Error(`'${this.name}' authentication strategy requires a '${prop}' setting`);
            }
        });
    }
    get configuration() {
        const authConfig = this.authentication.configuration;
        const config = super.configuration || {};
        return {
            service: authConfig.service,
            entity: authConfig.entity,
            header: 'Authorization',
            schemes: ['Bearer'],
            ...config
        };
    }
    _normalizeResult(results) {
        // Paginated services return the array of results in the data attribute.
        let entities = results.data ? results.data : results;
        let entity = entities[0];

        // Handle bad username.
        if (!entity) {
            return Promise.reject(false); // eslint-disable-line
        }

        debug(`${this.configuration.entity} found`);
        return Promise.resolve(entity);
    }

    async parse(req) {
        const SPLIT_HEADER = /(\S+)\s+(\S+)/;
        const result = { strategy: this.name };
        const { header, schemes } = this.configuration;
        const headerValue = req.headers && req.headers[header.toLowerCase()];

        if (!headerValue || typeof headerValue !== 'string') {
            return null;
        }
        debug('Found parsed header value');

        const [, scheme = null, schemeValue = null] = headerValue.match(SPLIT_HEADER) || [];
        const hasScheme = scheme && schemes.some(
            current => new RegExp(current, 'i').test(scheme)
        );

        if (scheme && !hasScheme) {
            return null;
        }

        return {
            ...result,
            accessToken: hasScheme ? schemeValue : headerValue
        };
    }

    async authenticate(data, params) {
        const self = this;
        const accessToken = data.accessToken;
        const clientId = data.clientId;

        const { service, entity } = this.configuration;

        const usersService = this.app.service(service)
        const usernameField = this.configuration.usernameField;

        const clientsService = this.app.service(this.configuration.clientsService)
        const clientEntity = this.configuration.clientEntity;
        const clientIdField = this.configuration.clientIdField;

        return new Promise((resolve, reject) => {
            request.get(this.configuration.url, { 'auth': { 'bearer': accessToken } }, (err, httpResponse, body) => {
                if (err) {
                    reject(new NotAuthenticated(err));
                } else if (httpResponse.statusCode != 200) {
                    reject(new NotAuthenticated('The provided access token is not valid.'));
                } else {
                    const verification = JSON.parse(body);
                    if (clientId && verification.response.client.id !== clientId) {
                        reject(new NotAuthenticated('The Access Token is not valid for the Client ID that you provided.'));
                    }
                    const username = verification.response.user.email;
                    const id = usersService.id;
                    if (id === null || id === undefined) {
                        debug('failed: the service.id was not set');
                        return reject(new NotAuthenticated('the `id` property must be set on the entity service for authentication'));
                    }
                    Promise.all([
                        usersService.find({ query: { [usernameField]: username, $limit: 1 } }),
                        clientsService.find({ query: { [clientIdField]: clientId || verification.response.client.id, $limit: 1 } })
                    ]).then(responses => {
                        const promises = [];
                        const userResults = responses[0].data || responses[0];
                        const clientResults = responses[1].data || responses[1];
                        if (!userResults.length) {
                            promises.push(usersService.create({
                                [usernameField]: username
                            }));
                        } else {
                            promises.push(self._normalizeResult(userResults));
                        }
                        if (!clientResults.length) {
                            promises.push(clientsService.create({
                                [clientIdField]: clientId || verification.response.client.id
                            }));
                        } else {
                            promises.push(self._normalizeResult(clientResults));
                        }
                        return Promise.all(promises);
                    }).then(entities => {
                        resolve({
                            authentication: { strategy: self.name },
                            [entity]: entities[0],
                            [clientEntity]: entities[1]
                        });
                    }).catch(error => {
                        if (error) {
                            reject(error)
                        } else {
                            reject(new NotAuthenticated('Invalid login'));
                        }
                    });
                }
            });

        })
    }
}