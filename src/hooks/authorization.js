const { Forbidden, GeneralError } = require('@feathersjs/errors');

const isInternal = context => {
    return !context.params.provider
}

const checkOwnership = context => entity => {
    //It should be an internal method, so allow access!.
    if (isInternal(context) || !entity) {
        return true;
    } else if (
        context.service &&
        context.service.Model &&
        context.service.Model.modelName === 'users' &&
        context.params &&
        context.params.user &&
        context.params.user._id &&
        entity &&
        entity._id &&
        entity._id.toString() === context.params.user._id.toString()) {
        return true;
    } else if (
        entity &&
        entity.user &&
        context.params &&
        context.params.user &&
        context.params.user._id &&
        (
            entity.user.toString() === context.params.user._id.toString() ||
            (entity.user._id && entity.user._id.toString() === context.params.user._id.toString()) ||
            (entity.sharedWith && entity.sharedWith.some(u => u._id ?
                u._id.toString() === context.params.user._id.toString() :
                u.toString() === context.params.user._id.toString())
            )
        )
    ) {
        if (entity.client && context.params.client && context.params.client._id) {
            return entity.client.toString() === context.params.client._id.toString();
        } else return true;
    }
    return false;
}

/**
 * NOTE: In both of the hooks below I'm assuming that if no 'context.params.user.user._id' or
 * 'context.params.client._id' is set, it means that the JWT was willingly set by the Broker
 * to allow access to any resource. However, I may change this assumption in the future as I tighten
 * up the security policies.
 */
module.exports.canWriteEntity = context => {
    const checker = checkOwnership(context);
    if (isInternal(context)) {
        return context;
    } else if (context.method === 'create') {
        if (checker(context.data)) return context;
        else throw new Forbidden('Write access denied.');
    } else {
        return new Promise((resolve, reject) => {
            let promise = Promise.resolve(false);
            if (context.id) {
                promise = context.service.get(context.id).then(entity => checker(entity))
            } else if (context.params.query) {
                if (checker(context.params.query)) {
                    promise = Promise.resolve(true);
                } else {
                    promise = context.service.find({ query: context.params.query }).then(entities => {
                        const results = entities.data ? entities.data : entities;
                        return results.every(checker);
                    });
                }
            }
            promise.then(isOwner => {
                if (isOwner) resolve(context);
                else reject(new Forbidden('Write access denied.'));
            }).catch(e => reject(e));
        });
    }
}

module.exports.canReadEntity = context => {
    if (context.type !== 'after') {
        throw new GeneralError(`This hook should only be used as a 'after' hook.`);
    } else if (isInternal(context)) {
        return context
    } else {
        const checker = checkOwnership(context);
        let result;
        if (context.method === 'get') {
            result = context.result;
        } else if (context.method === 'find') {
            result = context.result.data ? context.result.data : context.result;
        }
        if (Array.isArray(result) && result.every(checker) || !Array.isArray(result) && checker(result)) {
            return context;
        } else throw new Forbidden('Read access denied.');
    }
}

