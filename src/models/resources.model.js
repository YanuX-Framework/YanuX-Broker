// resources-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const resources = new Schema({
    app: { type: String, required: true },
    user: { type: String, required: true },
    data: { type: Object, default: {} }
  }, { timestamps: true });
  resources.index({ app: 1, user: 1 }, { unique: true });
  
  return mongooseClient.model('resources', resources);
};
