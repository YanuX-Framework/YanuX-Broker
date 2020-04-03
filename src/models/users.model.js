// users-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const users = new mongooseClient.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String },
    brokerName: { type: String, required: true, default: app.get('name') }
  }, { timestamps: true, minimize: false });

  users.pre('validate', function(next) {
    this.brokerName = app.get('name');
    next();
  });

  return mongooseClient.model('users', users);
};
