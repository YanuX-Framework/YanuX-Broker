// proxemics-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const proxemics = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true, unique: true },
    state: { type: Schema.Types.Mixed, required:true, default: [] }
  }, { timestamps: true });

  return mongooseClient.model('proxemics', proxemics);
};