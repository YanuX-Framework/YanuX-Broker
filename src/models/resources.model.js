// resources-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const resources = new Schema({
    name: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'clients', required: true },
    default: { type: Boolean, default: true, required: true },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'users' }],
    data: { type: Object, required: true, default: {} },
    brokerName: { type: String, required: true, default: app.get('name') }
  }, { timestamps: true, minimize: false });

  resources.index({ user: 1, client: 1, default: 1 }, { unique: true, partialFilterExpression: { default: true } });

  resources.pre('deleteOne', function (next, next2) {
    this.model.findOne(this.getQuery()).then(res => {
      if (res.default) {
        next(new Error('A default resource cannot be removed'));
      } else { next(); }
    });
  });

  resources.pre('validate', function (next) {
    this.brokerName = app.get('name');
    next();
  });

  return mongooseClient.model('resources', resources);
};
