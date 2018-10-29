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
    deviceUuid: {type: String, required: true },
    beacon: { type: Object, required: true }
  }, { timestamps: true, minimize: false });
  beacons.index({beaconKey: 1, deviceUuid: 1}, {unique: true});

  return mongooseClient.model('beacons', beacons);
};
