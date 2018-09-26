const errors = require('@feathersjs/errors');

const checkOwnership = context => entity =>
    entity.user === context.params.payload.userId &&
    entity.client === context.params.payload.clientId

module.exports.checkEntityWrite = context => {
    if (context.type !== 'before') {
        throw new Error(`The 'restrictToOwner' hook should only be used as a 'before' hook.`);
    }

    if (context.params.payload &&
        context.params.payload.userId &&
        context.params.payload.clientId) {
        let promise = Promise.resolve(false);
        if (context.id) {
            promise = context.service
                .get(context.id)
                .then(checkOwnership(context))
        } else if (context.params.query) {
            promise = context.service
                .find({ query: context.params.query })
                .then(entities => {
                    const results = entities.data ? entities.data : entities.result;
                    return results.every(checkOwnership(context));
                });
        }
        promise.then(isOwner => {
            if (isOwner) {
                return context;
            }
            throw new errors.Forbidden('You are not allowed to access this resource.');
        }).catch(e => { throw e });
    } else {
        return context;
    }
}

module.exports.checkEntityRead = context => {
    if (context.type !== 'after') {
        throw new Error(`The 'restrictToOwner' hook should only be used as a 'after' hook.`);
    }
    const result = context.result.data ? context.result.data : context.result;
    if (context.params.payload &&
        context.params.payload.userId &&
        context.params.payload.clientId &&
        ((Array.isArray(result) && result.every(checkOwnership(context)))) ||
        (!Array.isArray(result) && checkOwnership(context)(result))) {
        throw new errors.Forbidden('You are not allowed to access this resource.');
    }
    return context;
}

