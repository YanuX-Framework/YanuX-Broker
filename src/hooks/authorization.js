const errors = require('@feathersjs/errors');

const checkOwnership = context => entity => {
    if (entity.user &&
        entity.client &&
        context.params &&
        context.params.payload &&
        context.params.payload.userId &&
        entity.user.toString() === context.params.payload.userId.toString()) {
        if (context.params.payload.clientId) {
            return entity.client.toString() === context.params.payload.clientId.toString();
        }
        return true;
    }
    //External call, if it didn't pass the checks above the access should be blocked.
    if(context.params.provider) {
        return false;
    //It should be an internal method, so allow access anyway.
    } else {
        return true;
    }
}


/**
 * NOTE: In both of the hooks below I'm assuming that if no 'context.params.payload.userId' or
 * 'context.params.payload.clientId' is set, it means that the JWT was willingly set by the Broker
 * to allow access to any resource. However, I may change this assumption in the future as I tighten
 * up the security policies.
 */
module.exports.canWriteEntity = context => {
    const checker = checkOwnership(context);
    if (context.method === 'create') {
        if (checker(context.data)) {
            return context;
        } else {
            throw new errors.Forbidden('Write access denied.')
        }
    } else {
        return new Promise((resolve, reject) => {
            let promise = Promise.resolve(false);
            if (context.id) {
                promise = context.service
                    .get(context.id)
                    .then(entity => checker(entity))
            } else if (context.params.query
                && checker(context.params.query)) {
                /**
                 * NOTE: At this point I could probably just set promise = Promise.resolve(true).
                 * The extra database query is should really be unnecessary and I may remove it
                 * just to potentially save a couple of milliseconds.
                 */
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
    }
}

module.exports.canReadEntity = context => {
    if (context.type !== 'after') {
        throw new Error(`This hook should only be used as a 'after' hook.`);
    }
    const checker = checkOwnership(context);
    let result;
    if (context.method === 'get') {
        result = context.result;
    } else if (context.method === 'find') {
        result = context.result.data ? context.result.data : context.result;
    }
    if (Array.isArray(result) && result.every(checker) ||
        !Array.isArray(result) && checker(result)) {
        return context;
    }
    throw new errors.Forbidden('Read access denied.');
}

