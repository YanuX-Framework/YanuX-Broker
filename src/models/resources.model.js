// resources-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  
  const resources = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'clients', required: true },
    data: { type: Object, default: {} }
  }, { timestamps: true });
  resources.index({ user: 1, client: 1 }, { unique: true });
  
  return mongooseClient.model('resources', resources);
};
