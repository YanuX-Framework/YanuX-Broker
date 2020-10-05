// location-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const modelName = 'location';
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const BeaconSchema = new Schema({
    uuid: { type: String },
    major: { type: Number },
    minor: { type: Number }
  }, { _id: false });

  const ProximitySchema = new Schema({
    beacon: { type: BeaconSchema },
    distance: { type: Number },
    zone: { type: String }
  }, { _id: false });

  const PositionSchema = new Schema({
    place: { type: String },
    x: { type: Number },
    y: { type: Number }
  }, { _id: false });

  const schema = new Schema({
    username: { type: String, required: true },
    deviceUuid: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    proximity: { type: ProximitySchema },
    position: { type: PositionSchema }
  }, { timestamps: true, minimize: false });

  schema.index({
    username: 1, deviceUuid: 1,
    'proximity.beacon.uuid': 1,
    'proximity.beacon.major': 1,
    'proximity.beacon.minor': 1
  }, { unique: true });


  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);

};
