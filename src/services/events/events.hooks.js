const { authenticate } = require('@feathersjs/authentication').hooks;

const userAssociation = context => {
  if (context.data && context.data.resource && context.params && context.params.user) {
    const resourceId = context.data.resource;
    const userId = context.params.user._id;
    return new Promise((resolve, reject) => {
      context.app.service('resources').get(resourceId)
        .then(resource => {
          if (resource.user.toString() === userId ||
            (resource.sharedWith && resource.sharedWith.some(u => u.toString() === userId))) {
            context.data.user = resource.user;
            context.data.sharedWith = resource.sharedWith
          }
          resolve(context)
        }).catch(e => reject(e));
    })
  } else { return context; }
}

module.exports = {
  before: {
    all: [authenticate('jwt', 'yanux')],
    find: [],
    get: [],
    create: [userAssociation],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
