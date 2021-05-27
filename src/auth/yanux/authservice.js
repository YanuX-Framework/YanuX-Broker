const { AuthenticationService } = require('@feathersjs/authentication');

module.exports = class YanuxAuthenticationService extends AuthenticationService {
    async getPayload(authResult, params) {
        const payload = await super.getPayload(authResult, params);
        const { user, client } = authResult;
        return { ...payload, user, client };
    }
    async getTokenOptions(authResult, params) {
        const jwtOptions = await super.getTokenOptions(authResult, params);
        jwtOptions.header = { kid: this.app.get('keys').private_jwk.kid };
        return jwtOptions;
    }
    async parse(req, res, ...names) {
        const strategies = this.getStrategies(...names)
            .filter(current => current && typeof current.parse === 'function');
        for (const authStrategy of strategies) {
            const value = await authStrategy.parse(req, res);
            if (value !== null) {
                if (value.strategy === 'jwt') {
                    try { if (await this.verifyAccessToken(value.accessToken)) { return value; } } catch (e) { }
                } else { return value; }
            }
        }
        return null;
    }
}