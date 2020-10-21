// instances-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
const brokerNamePlugin = require('./plugins/broker-name.plugin');

module.exports = function (app) {
  const modelName = 'instances';
  const mongooseClient = app.get('mongooseClient');

  const { Schema } = mongooseClient;

  const componentsDistribution = new Schema({
    auto: { type: Boolean, required: true, default: true },
    components: { type: Object, required: true, default: {} }
  }, { _id: false });

  const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'clients', required: true },
    device: { type: Schema.Types.ObjectId, ref: 'devices', required: true },
    //TODO: Implement "Dynamic" Instance Sharing
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'users' }],
    instanceUuid: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: false },
    active: { type: Boolean, required: true, default: true },
    componentsDistribution
  }, { timestamps: true, minimize: false });

  schema.plugin(brokerNamePlugin, { brokerName: app.get('name') });

  //TODO: Should the "device" also be part of this unique key? Perhaps, at the very least, a device can be used by different users at different times.
  schema.index({ user: 1, client: 1, device: 1, instanceUuid: 1 }, { unique: true });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
};