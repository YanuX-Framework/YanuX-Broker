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

      let clientId = null;
      if (authResult.client) {
        clientId = authResult.client._id
      } else if (authResult.authentication && authResult.authentication.payload && authResult.authentication.payload.client) {
        clientId = authResult.authentication.payload.client._id
      }

      if (clientId) {
        app.channel(`clients/${clientId}`).join(connection);
        app.channel(`users/${user._id}/clients/${clientId}`).join(connection);
      }
    }
  });

  app.on('logout', (authResult, { connection }) => {
    app.channel(app.channels).leave(connection);
    app.channel('anonymous').join(connection);
  });

  const publisher = (data, context) => {
    let channel;
    if (context.path === 'clients') {
      channel = app.channel(`clients/${data._id}`);
    } else if (data && data.client && data.user) {
      const channels = [];
      channels.push(`users/${data.user._id}/clients/${data.client._id}`)
      if (data.sharedWith) {
        channels.push(...data.sharedWith.map(u => `users/${u._id}/clients/${data.client._id}`));
      }
      if(context.result && context.result.prevSharedWith) {
        channels.push(...context.result.prevSharedWith.map(u => `users/${u._id}/clients/${data.client._id}`));
      }
      channel = app.channel(...channels);
    } else if (data && data.client) {
      channel = app.channel(`clients/${data.client._id}`);
    } else if (data && data.user) {
      channel = app.channel(`users/${data.user._id}`);
    } else if (app.channels.length > 0) {
      channel = app.channel(app.channels);
    }
    return channel;
    //return app.channel(app.channels);
  };

  app.publish(publisher);
};
