// instances-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const instances = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'clients', required: true },
    device: { type: Schema.Types.ObjectId, ref: 'devices', required: true },
    instanceUuid: { type: String, required: true, unique: true },
    active: { type: Boolean, required: true, default: true },
    brokerName: { type: String, required: true, default: app.get('name') }
  }, { timestamps: true, minimize: false });

  instances.index({ user: 1, client: 1, device: 1, instanceUuid: 1 }, { unique: true });
  return mongooseClient.model('instances', instances);
};