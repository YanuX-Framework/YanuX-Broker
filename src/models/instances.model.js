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
  }, { timestamps: true });

  instances.index({ user: 1, client: 1, device: 1 }, { unique: true });

  return mongooseClient.model('instances', instances);
};