const url = require('url');
const MongoClient = require('mongodb').MongoClient;

module.exports = function (app) {
  const config = app.get('mongodb');
  const dbName = url.parse(config).path.substring(1);
  const promise = MongoClient.connect(config, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(client => {
    return client.db(dbName);
  });

  app.set('mongoClient', promise);
};
