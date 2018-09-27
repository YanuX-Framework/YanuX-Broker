const errors = require('@feathersjs/errors');

const checkOwnership = context => entity =>
    entity.user &&
    entity.client &&
    context.params &&
    context.params.payload &&
    context.params.payload.userId &&
    context.params.payload.clientId &&
    entity.user.toString() === context.params.payload.userId.toString() &&
    entity.client.toString() === context.params.payload.clientId.toString()

module.exports.checkEntityOwnership = context => {
    const checker = checkOwnership(context);
    if (context.param &&
        context.params.payload &&
        context.params.payload.userId &&
        context.params.payload.clientId) {
        return new Promise((resolve, reject) => {
            let promise = Promise.resolve(false);
            if (context.method === 'create') {
                promise = Promise.resolve(checker(context.data));
            } else if (context.id) {
                promise = context.service
                    .get(context.id)
                    .then(entity => checker(entity))
            } else if (context.params.query) {
                promise = context.service
                    .find({ query: context.params.query })
                    .then(entities => {
                        const results = entities.data ? entities.data : entities;
                        return results.every(checker);
                    });
            }
            promise.then(isOwner => {
                if (isOwner) {
                    resolve(context);
                } else {
                    reject(new errors.Forbidden('Write access denied.'));
                }
            }).catch(e => reject(e));
        });
    } else {
        return context;
    }
}

module.exports.checkEntityRead = context => {
    if (context.type !== 'after') {
        throw new Error(`This hook should only be used as a 'after' hook.`);
    }
    const checker = checkOwnership(context);
    let result;
    switch (context.method) {
        case 'get':
            result = context.result;
            break;
        case 'find':
        default:
            result = context.result.data ? context.result.data : context.result;
            break;
    }
    if (context.param &&
        context.params.payload &&
        context.params.payload.userId &&
        context.params.payload.clientId &&
        (Array.isArray(result) && !result.every(checker) ||
            !Array.isArray(result) && !checker(result))) {
        throw new errors.Forbidden('Read access denied.');
    }
    return context;
}

