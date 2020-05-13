// beaconLogs-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const modelName = 'beaconLogs';
  const mongooseClient = app.get('mongooseClient');

  const { Schema } = mongooseClient;

  const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** TODO: Maybe I should a direct relationship to the devices collection! **/
    deviceUuid: { type: String, required: true },
    method: { type: String, required: true },
    beaconKey: { type: String, required: true },
    beacon: { type: Object, required: true },
    brokerName: { type: String, required: true, default: app.get('name') }
  }, { timestamps: true, minimize: false });

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
