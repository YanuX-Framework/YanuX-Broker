module.exports = options => context => {
    if (context.params) {
        context.params.mongoose = Object.assign({}, context.params.mongoose, options);
    }
    return context;
}