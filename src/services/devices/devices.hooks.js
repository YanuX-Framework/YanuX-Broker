const { authenticate } = require('@feathersjs/authentication').hooks;
const { NotAuthenticated } = require('@feathersjs/errors');

const canReadEntity = require('../../hooks/authorization').canReadEntity;
const canWriteEntity = require('../../hooks/authorization').canWriteEntity;

function beforeCreateUpdatePatch(context) {
  if (context.data && !context.data.user) {
    if (context.params.user) {
      context.data.user = context.params.user._id;
    } else {
      throw new NotAuthenticated('No user associated with the current connection.');
    }
  }
  return context;
}

function afterPatch(context) {
  if (context.method === 'patch' && context.params.user
    && context.params.query && context.params.query.deviceUuid) {
    return new Promise((resolve, reject) => {
      if (!context.result.length) {
        context.service.create(context.data)
          .then(device => {
            context.result = [device];
            resolve(context)
          }).catch(e => reject(e));
      } else { resolve(context); }
    });
  } else return context;
}

module.exports = {
  before: {
    all: [authenticate('jwt', 'yanux')],
    find: [],
    get: [],
    create: [beforeCreateUpdatePatch, canWriteEntity],
    update: [beforeCreateUpdatePatch, canWriteEntity],
    patch: [beforeCreateUpdatePatch, canWriteEntity],
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
