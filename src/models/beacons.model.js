// beacons-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const modelName = 'beacons';
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** TODO: Maybe I should make a direct relationship to the devices collection! **/
    deviceUuid: { type: String, required: true },
    beaconKey: { type: String, required: true },
    /** TODO: Create a proper Schema for beacon! */
    beacon: { type: Schema.Types.Mixed, required: true },
    brokerName: { type: String, required: true, default: app.get('name') }
  }, { timestamps: true, minimize: false });
  
  schema.index({ beaconKey: 1, deviceUuid: 1 }, { unique: true });

  schema.pre('validate', function (next) {
    this.brokerName = app.get('name');
    next();
  });
  
  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
};
