// users-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const users = new mongooseClient.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String }
  }, { timestamps: true, minimize: false });
  return mongooseClient.model('users', users);
};
