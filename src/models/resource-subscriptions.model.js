// resource-subscription-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const modelName = 'resourceSubscriptions';
  const mongooseClient = app.get('mongooseClient');

  const { Schema } = mongooseClient;

  const schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'clients', required: true },
    resource: { type: Schema.Types.ObjectId, ref: 'resources', required: true }
  }, { timestamps: true, minimize: false });

  schema.index({ user: 1, client: 1 }, { unique: true });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);

};
