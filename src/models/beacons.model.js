// beacons-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const beacons = new Schema({
    beaconKey: {type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deviceId: {type: String, required: true },
    beacon: { type: Object, required: true }
  }, {
    timestamps: true
  });
  beacons.index({beaconKey: 1, deviceId: 1}, {unique: true});

  return mongooseClient.model('beacons', beacons);
};
