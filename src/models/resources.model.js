// resources-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const modelName = 'resources';
  const mongooseClient = app.get('mongooseClient');

  const { Schema } = mongooseClient;

  const schema = new Schema({
    name: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'clients', required: true },
    default: { type: Boolean, default: true, required: true },
    sharedWith: [{
      type: Schema.Types.ObjectId, ref: 'users', validate: {
        validator: function (v) {
          return new Promise((resolve, reject) => this.model.findOne(this.getFilter())
            .then(res => resolve(!res.user.equals(v)).catch(e => reject(e))));
        }, message: 'A resource cannot be shared with its owner.'
      }
    }],
    data: { type: Object, required: true, default: {} },
    brokerName: { type: String, required: true, default: app.get('name') }
  }, { timestamps: true, minimize: false });

  schema.index({ user: 1, client: 1, default: 1 }, { unique: true, partialFilterExpression: { default: true } });

  schema.pre('validate', function (next) {
    this.brokerName = app.get('name');
    next();
  });

  schema.pre('deleteOne', function (next) {
    this.model.findOne(this.getFilter()).then(res => {
      if (res.default) {
        next(new Error('A default resource cannot be removed.'));
      } else { next(); }
    });
  });


  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
};
