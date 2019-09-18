const { authenticate } = require('@feathersjs/authentication').hooks;

const canReadEntity = require('../../hooks/authorization').canReadEntity
const canWriteEntity = require('../../hooks/authorization').canWriteEntity

function beforeCreateUpdatePatch(context) {
  if (context.data && context.data.user) {
    return context;
  } else if (context.params.user) {
    context.data.user = context.params.user;
  } else throw Error('No user associated with the current connection.');
}

function afterPatch(context) {
  if (
    context.method === 'patch' &&
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
      } else { resolve(context); }
    }).catch(e => { throw e });
  } else return context;
}

module.exports = {
  before: {
    all: [authenticate('jwt', 'yanux')],
    find: [],
    get: [],
    create: [canWriteEntity, beforeCreateUpdatePatch],
    update: [canWriteEntity, beforeCreateUpdatePatch],
    patch: [canWriteEntity, beforeCreateUpdatePatch],
    remove: [canWriteEntity]
  },

  after: {
    all: [],
    find: [canReadEntity],
    get: [canReadEntity],
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
