// devices-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
const { isString } = require('lodash');
const _ = require('lodash');
const brokerNamePlugin = require('./plugins/broker-name.plugin');

module.exports = function (app) {
  const modelName = 'devices';
  const mongooseClient = app.get('mongooseClient');

  const { Schema } = mongooseClient;

  const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    deviceUuid: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    beaconValues: { type: Array },
    /**
     * TODO:
     * Come up with a Capabilities Model that can be used for automatic user interface adaptation.
     * For now, I'll just leave as a "mixed" type.
     */
    capabilities: { type: Schema.Types.Mixed }
  }, { timestamps: true, minimize: false });

  schema.plugin(brokerNamePlugin, { brokerName: app.get('name') });

  schema.pre(['validate', 'save', 'updateOne'], { document: true, query: false }, function (next) {
    if (this.beaconValues) {
      this.beaconValues = this.beaconValues.map(v => isString(v) ? v.toLowerCase() : v);
    }
    next();
  });

  schema.pre(['findOneAndUpdate', 'update', 'updateOne', 'updateMany'], { document: false, query: true }, function (next) {
    const beaconValues = this.get('beaconValues');
    if (beaconValues) {
      this.set({ beaconValues: beaconValues.map(v => isString(v) ? v.toLowerCase() : v) });
    }
    next();
  });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
};