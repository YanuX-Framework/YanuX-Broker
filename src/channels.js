module.exports = function (app) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return;
  };

  app.on('connection', connection => {
    // On a new real-time connection, add it to the anonymous channel
    app.channel('anonymous').join(connection);
  });

  app.on('login', (authResult, { connection }) => {
    // connection can be undefined if there is no
    // real-time connection, e.g. when logging in via REST
    if (connection) {
      // Obtain the logged in user from the connection
      const user = connection.user;
      // The connection is no longer anonymous, remove it
      app.channel('anonymous').leave(connection);
      // Add it to the authenticated user channel
      app.channel('authenticated', 'users').join(connection);
      // Add the user to a its specific channel
      app.channel(`users/${user._id}`).join(connection);
    }
  });

  app.on('logout', (authResult, { connection }) => {
    app.channel(app.channels).leave(connection);
    app.channel('anonymous').join(connection);
  });

  const publisher = (data, context) => {
    let channel;
    // if (context.path === 'clients') {
    //   channel = app.channel(`clients/${data._id}`);
    // } else if (data && data.client) {
    //   channel = app.channel(`clients/${data.client._id}`);
    // } else if (data && data.user) {
    //   channel = app.channel(`users/${data.user._id}`);
    // } else 
    if (app.channels.length > 0) {
      channel = app.channel(app.channels);
    }
    if (channel) {
      if (context.params && context.params.connection && context.params.connection.user) {
        channel = channel.filter(connection => connection.user ? connection.user._id.equals(context.params.connection.user._id) : false);
      } else if (data && data.user) {
        channel = channel.filter(connection => connection.user ? connection.user._id.equals(data.user._id) : false);
      } else if (context.data && context.data.user) {
        channel = channel.filter(connection => connection.user ? connection.user._id.equals(context.data.user._id) : false);
      } else if (context.result && context.result.user) {
        channel = channel.filter(connection => connection.user ? connection.user._id.equals(context.result.user._id) : false);
      } else if (context.params && context.params.query && context.params.query.user) {
        channel = channel.filter(connection => connection.user ? connection.user._id.equals(context.params.query.user._id) : false);
      }
    }
    if (context.path === 'resources') {
      console.log(`PUBLISHING TO ${channel.connections.length} CONNECTIONS!`);
    }
    return channel;
  };

  app.publish(publisher);
};
