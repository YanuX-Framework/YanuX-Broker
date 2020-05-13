module.exports.prevSharedWithBefore = context => {
    const savePrevSharedWith = entity => {
        if (entity.sharedWith) {
            if (!context.extra) { context.extra = {}; }
            context.extra.prevSharedWith = entity.sharedWith;
        }
    }
    if (context.type === 'before') {
        return new Promise((resolve, reject) => {
            if (context.id) {
                context.service.get(context.id).then(entity => {
                    savePrevSharedWith(entity);
                    resolve(context);
                }).catch(e => reject(e));
            } else if (context.params && context.params.query) {
                context.service.find({ query: context.params.query }).then(results => {
                    const entities = results.data ? results.data : results;
                    if (entities.length === 1) { savePrevSharedWith(entities[0]); }
                    resolve(context);
                }).catch(e => reject(e));
            } else { resolve(context) }
        });
    } else { return context; }
}

module.exports.prevSharedWithAfter = context => {
    if (context.type === 'after') {
        return new Promise(resolve => {
            if (context.result && context.extra && context.extra.prevSharedWith) {
                context.result.prevSharedWith = context.extra.prevSharedWith;
            }
            resolve(context);
        });
    } else { return context; }
}