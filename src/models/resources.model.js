// resources-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const resources = new Schema({
    name: { type: String },
    brokerName: { type: String, required: true, default: app.get('name') },
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'clients', required: true },
    default: { type: Boolean, default: true, required: true },
    sharedWith: { type: [Schema.Types.ObjectId], ref: 'users', default: [], required: true },
    data: { type: Object, required: true, default: {} }
  }, { timestamps: true, minimize: false });
  resources.index({ user: 1, client: 1, default: 1 }, { unique: true, partialFilterExpression: { default: true } });

  return mongooseClient.model('resources', resources);
};
