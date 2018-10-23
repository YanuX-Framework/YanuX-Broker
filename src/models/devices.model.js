// devices-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const devices = new Schema({
    deviceUuid: { type: String, required: true, unique: true },
    beaconValues: { type: Array },
    /**
     * TODO:
     * Come up with a Capabilities Model that can be used for automatic user interface adaptation.
     * For now, I'll just leave as a "mixed" type.
     */
    capabilities: { type: Schema.Types.Mixed },
  }, { timestamps: true });
  return mongooseClient.model('devices', devices);
};