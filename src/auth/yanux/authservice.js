const { AuthenticationService } = require('@feathersjs/authentication');

module.exports = class YanuxAuthenticationService extends AuthenticationService {
    async getPayload(authResult, params) {
        const payload = await super.getPayload(authResult, params);
        const { user, client } = authResult;
        return { ...payload, user, client };
    }
    async parse(req, res, ...names) {
        const strategies = this.getStrategies(...names)
            .filter(current => current && typeof current.parse === 'function');
        for (const authStrategy of strategies) {
            const value = await authStrategy.parse(req, res);
            if (value !== null) {
                if (value.strategy === 'jwt') {
                    try {
                        const isJwtValid = await this.verifyAccessToken(value.accessToken);
                        if (isJwtValid) {
                            return value;
                        }
                    } catch (e) { continue; }
                } else {
                    return value;
                }
            }
        }
        return null;
    }
}