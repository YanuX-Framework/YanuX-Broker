// devices-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const modelName = 'devices';
  const mongooseClient = app.get('mongooseClient');

  const { Schema } = mongooseClient;
  
  const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    deviceUuid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    beaconValues: { type: Array },
    /**
     * TODO:
     * Come up with a Capabilities Model that can be used for automatic user interface adaptation.
     * For now, I'll just leave as a "mixed" type.
     */
    capabilities: { type: Schema.Types.Mixed },
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