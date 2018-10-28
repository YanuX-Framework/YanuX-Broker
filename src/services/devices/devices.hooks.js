const { authenticate } = require('@feathersjs/authentication').hooks;

function afterPatch(context) {
  if (context.method === 'patch' &&
    context.params.user &&
    context.params.query &&
    context.params.query.deviceUuid) {
    return new Promise((resolve, reject) => {
      if (!context.result.length) {
        context.service.create(context.data)
          .then(device => {
            context.result = [device];
            resolve(device)
          }).catch(e => reject(e));
      } else {
        resolve(context.result[0]);
      }
    }).then(device => {
      if (context.params.connection && context.data) {
        context.app.channel(`devices/${device._id}`).join(context.params.connection)
        context.app.channel(`devices/${device.deviceUuid}`).join(context.params.connection);
        context.app.channel(`users/${context.params.user._id}/devices/${device._id}`).join(context.params.connection);
        context.app.channel(`users/${context.params.user.email}/devices/${device.deviceUuid}`).join(context.params.connection);
      }
    }).catch(e => { throw e });
  } else return context;
}

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [],
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
    patch: [afterPatch],
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
