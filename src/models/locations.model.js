// locations-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
const brokerNamePlugin = require('./plugins/broker-name.plugin');

module.exports = function (app) {
  const modelName = 'locations';
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const BeaconSchema = new Schema({
    uuid: { type: String, required: true, lowercase: true, trim: true },
    major: { type: Number, required: true },
    minor: { type: Number, required: true }
  }, { _id: false });

  const ProximitySchema = new Schema({
    beacon: { type: BeaconSchema, required: true },
    distance: { type: Number, required: true },
    zone: { type: String, required: false }
  }, { _id: false });

  const PositionSchema = new Schema({
    place: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    orientation: { type: Number, required: true },
    headingVector: { type: [Number], required: false },
    zone: { type: String, required: false }
  }, { _id: false });


  const schema = new Schema({
    username: { type: String, required: true },
    deviceUuid: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    proximity: { type: ProximitySchema, required: function () { return !this.position } },
    position: { type: PositionSchema, required: function () { return !this.proximity } }
  }, { timestamps: true, minimize: false });

  schema.index({
    username: 1, deviceUuid: 1,
    'proximity.beacon.uuid': 1,
    'proximity.beacon.major': 1,
    'proximity.beacon.minor': 1,
    position: 1
  }, { unique: true });

  /** TODO:
   * Add/Develop a new Mongoose plugin that keeps the "brokerName" field up-to-date: https://mongoosejs.com/docs/plugins.html
   * I tried to do it in other models by using the pre-validate middleware, but it doesn't cover all bases.
   * I'll probably have to use more middleware "stages": https://mongoosejs.com/docs/middleware.html#types-of-middleware
   * DONE: Test it a little bit more and add it to the rest of the models!
   */
  schema.plugin(brokerNamePlugin, { brokerName: app.get('name') });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);

};
