// devices-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const devices = new Schema({
    deviceUuid: { type: String, required: true, unique: true },
    beaconIdValues: { type: Array, required: true }
  }, { timestamps: true });
  return mongooseClient.model('devices', devices);
};