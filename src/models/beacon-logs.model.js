// beaconLogs-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const beaconLogs = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** TODO: Maybe I should a direct relationship to the devices collection! **/
    deviceUuid: { type: String, required: true },
    method: { type: String, required: true },
    beaconKey: { type: String, required: true },
    beacon: { type: Object, required: true },
    brokerName: { type: String, required: true, default: app.get('name') }
  }, { timestamps: true });

  return mongooseClient.model('beaconLogs', beaconLogs);
};
