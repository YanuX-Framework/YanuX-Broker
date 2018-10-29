// clients-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const clients = new Schema({
    id: { type: String, required: true, unique: true }
  }, { timestamps: true, minimize: false });

  return mongooseClient.model('clients', clients);
};
