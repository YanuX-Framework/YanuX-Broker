// clients-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const clients = new Schema({
    id: { type: String, required: true, unique: true },
    brokerName: { type: String, required: true, default: app.get('name') }
  }, { timestamps: true, minimize: false });

  clients.pre('validate', function (next) {
    this.brokerName = app.get('name');
    next();
  });

  return mongooseClient.model('clients', clients);
};
