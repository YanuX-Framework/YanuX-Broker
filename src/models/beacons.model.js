// beacons-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const beacons = new Schema({
    beacon: { type: Object, required: true },
    user: {type: Schema.Types.ObjectId, ref: 'User'},
  }, {
    timestamps: true
  });

  return mongooseClient.model('beacons', beacons);
};
