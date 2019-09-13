const { authenticate } = require('@feathersjs/authentication').hooks;
const { Conflict } = require("@feathersjs/errors");
const _ = require('lodash');

const canReadEntity = require('../../hooks/authorization').canReadEntity
const canWriteEntity = require('../../hooks/authorization').canWriteEntity

function logBeacons(context) {
  if (context.result) {
    let results;
    if (_.isArray(context.result) || _.isArray(context.result.data)) {
      results = context.result.data ? context.result.data : context.result
    } else {
      results = [context.result]
    }

    let promises = [];
    results.forEach(result => {
      const data = _.clone(result)
      data._id = null;
      data.createdAt = null;
      data.updatedAt = null;
      data.method = context.method;
      promises.push(context.app.service('beacon-logs').create(data));
    });
    return Promise.all(promises).then(() => context)
  } else return context;
}

function beforeCreate(context) {
  if (
    context.params.user &&
    context.data.beaconKey &&
    context.data.deviceUuid) {
    const user = context.params.user;
    const beaconkey = context.data.beaconKey;
    const deviceUuid = context.data.deviceUuid;
    return this.remove(null, {
      query: {
        user: user._id,
        deviceUuid: deviceUuid,
        beaconKey: beaconkey
      }
    }).then(() => context).catch(e => { throw e; });
  }
}

function beforePatchUpdate(context) {
  if (
    context.data &&
    context.data.beacon &&
    context.params.query) {
    const beacon = context.data.beacon;
    const query = context.params.query;
    return this.find({ query: query, paginate: false })
      .then(beacons => {
        if (!beacons.length) {
          context.service.create({
            user: context.data.user || context.params.query.user,
            deviceUuid: context.data.deviceUuid || context.params.query.deviceUuid,
            beaconKey: context.data.beaconKey || context.params.query.beaconKey,
            beacon: beacon
          }).then(data => {
            context.result = [data];
            return context;
          }).catch(e => { throw e; });
        } else if (beacons.every(b => beacon.timestamp >= b.beacon.timestamp)) {
          return context;
        } else {
          throw new Error('The new beacon\'s timestamp is older than the one(s) already stored.');
        }
      }).catch(e => { throw e; });
  }
}

function updateProxemics(context) {
  if (context.type !== 'after') {
    throw new Error('This must be run as an \'after\' hook.')
  }
  if (context.method !== 'create' && context.method !== 'patch' && context.method !== 'update' && context.method !== 'remove') {
    return context;
  }
  // TODO: **FINISH** implementing proxemics notifications.
  // Only run the "meat" of this hook for external requests!
  if (context.params.provider) {
    let scanningDevice, detectedDevice, deviceUuid, detectedBeacon;
    if (context.data) {
      deviceUuid = context.data.deviceUuid;
      detectedBeacon = context.data.beacon;
    }
    if (context.params && context.params.query) {
      deviceUuid = deviceUuid || context.params.query.deviceUuid;
      detectedBeacon = detectedBeacon || context.params.query.beacon;
    }
    if (context.result && context.result.length > 0) {
      deviceUuid = deviceUuid || context.result[0].deviceUuid;
      detectedBeacon = detectedBeacon || context.result[0].beacon;
    }
    if (!deviceUuid || !detectedBeacon) {
      return context;
    }

    /** 
     * NOTE: 
     * I'm not sure if this is the best idea to make sure that a proxemics record is ALWAYS present for the current user. 
     * But it's working fine right now. 
     */
    return new Promise((resolve, reject) => {
      context.app.service('proxemics')
        .create({ user: context.params.user._id })
        .then(proxemics => { resolve(proxemics) })
        .catch(e => {
          if (e instanceof Conflict) { resolve(); } 
          else { reject(); }
        });
    }).then(() => Promise.all([
      context.app.service('devices').find({ query: { $limit: 1, deviceUuid: deviceUuid } }),
      context.app.service('devices').find({ query: { $limit: 1, beaconValues: detectedBeacon.values } })
    ])).then(devices => {
      scanningDevice = (devices[0].data ? devices[0].data : devices[0])[0];
      detectedDevice = (devices[1].data ? devices[1].data : devices[1])[0];
      if (!scanningDevice || !detectedDevice) {
        // If either of the devices is missing from the database it's either an error or there's nothing to do with them.
        throw new Error('Either the scanning device or the detected device are absent from the database.');
      } else if (!scanningDevice._id.equals(detectedDevice._id)) {
        return context.app.service('proxemics').find({
          query: {
            $limit: 1,
            user: context.params.user._id
          }
        });
        // return Promise.all([
        //   context.app.service('beacons').find({
        //     query: {
        //       $limit: 1,
        //       updatedAt: { $gt: new Date().getTime() - context.app.get('beacons').maxInactivityTime },
        //       deviceUuid: detectedDevice.deviceUuid,
        //       'beacon.values': scanningDevice.beaconValues
        //     }
        //   }),
        //   context.app.service('proxemics').find({
        //     query: {
        //       $limit: 1,
        //       user: context.params.user._id
        //     }
        //   })
        // ])

        // return Promise.all([
        //   context.app.service('beacon-logs').find({
        //     query: {
        //       _aggregate: [
        //         {
        //           $match: {
        //             deviceUuid: scanningDevice.deviceUuid,
        //             'beacon.values': detectedDevice.beaconValues,
        //             updatedAt: { $gt: new Date(new Date().getTime() - context.app.get('beacons').maxInactivityTime) },
        //             $or: [{ method: 'create' }, { method: 'update' }, { method: 'patch' }]
        //           }
        //         },
        //         {
        //           $group: {
        //             _id: { deviceUuid: "$deviceUuid" },
        //             avgRssi: { $avg: "$beacon.rssi" },
        //             beacons: { $push: "$$ROOT" }
        //           }
        //         },
        //         { $match: { avgRssi: { $gt: -1000 } } },
        //         { $project: { _id: 1, avgRssi: 1, avgDistance: { $literal: null }, beacons: 1 } },
        //       ]
        //     }
        //   }),
        //   context.app.service('proxemics').find({
        //     query: {
        //       $limit: 1,
        //       user: context.params.user._id
        //     }
        //   })
        // ]);
      }
    }).then(result => {
      if (result) {
        const currProxemics = (result.data ? result.data : result)[0];
        //const beacon = (result[0].data ? result[0].data : result[0])[0];
        //const currProxemics = (result[1].data ? result[1].data : result[1])[0];
        if (currProxemics) {
          const proxemics = {
            user: context.params.user._id,
            state: _.cloneDeep(currProxemics.state) || {}
          }
          if (context.method === 'remove' || detectedBeacon.avgRssi < context.app.get('beacons').avgRssiThreshold) {
            delete proxemics.state[detectedDevice.deviceUuid];
          } else {
            proxemics.state[detectedDevice.deviceUuid] = detectedDevice.capabilities;
          }
          if (!_.isEqual(currProxemics.state, proxemics.state)) {
            return context.app.service('proxemics').update(currProxemics._id, proxemics);
          }
        } else {
          throw new Error('Current proxemics state is missing.');
        }
      }
    }).then(() => context).catch(e => { throw e; });
  }
  return context;
}

module.exports = {
  before: {
    all: [authenticate('jwt', 'yanux')],
    find: [],
    get: [],
    create: [canWriteEntity, beforeCreate],
    update: [canWriteEntity, beforePatchUpdate],
    patch: [canWriteEntity, beforePatchUpdate],
    remove: [canWriteEntity]
  },
  after: {
    all: [],
    find: [canReadEntity],
    get: [canReadEntity],
    create: [/* logBeacons, */ updateProxemics],
    update: [/* logBeacons, */ updateProxemics],
    patch: [/* logBeacons, */ updateProxemics],
    remove: [/* logBeacons, */ updateProxemics]
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