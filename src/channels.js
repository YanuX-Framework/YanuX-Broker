module.exports = function (app) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return;
  };

  const joinChannels = (user, connection) => {
    Promise.all([
      app.service('instances').find({ query: { user: user._id } }),
      app.service('devices').find({ query: { user: user._id } })
    ]).then(results => {
      const instances = results[0]; const devices = results[1];
      instances.forEach(instance => joinInstanceChannels(instance, connection));
      devices.forEach(device => joinDeviceChannels(device, connection));
    }).catch(e => { throw e });
  };

  const joinInstanceChannels = (instance, connection) => {
    app.channel(`instances/${instance._id}`).join(connection);
    app.channel(`users/${instance.user._id}`).join(connection);
    app.channel(`clients/${instance.client._id}`).join(connection);
    app.channel(`devices/${instance.device._id}`).join(connection);
  };

  const leaveInstanceChannels = instance => {
    if (app.channels.length > 0) {
      app.channel(app.channels).leave(connection =>
        connection.user._id.equals(instance.user._id)
      );
    }
  };

  const updateInstanceChannels = instance => {
    if (app.channels.length > 0) {
      // Find all connections for this user
      const { connections } = app.channel(app.channels).filter(connection => connection.user._id.equals(instance.user._id));
      // Leave all channels
      leaveInstanceChannels(instance);
      // Re-join all channels with the updated user information
      connections.forEach(connection => joinInstanceChannels(instance, connection));
    }
  };

  app.service('instances').on('created', updateInstanceChannels);
  app.service('instances').on('updated', updateInstanceChannels);
  app.service('instances').on('patched', updateInstanceChannels);
  app.service('instances').on('removed', leaveInstanceChannels);


  const joinDeviceChannels = (device, connection) => {
    app.channel(`devices/${device._id}`).join(connection);
  };

  const leaveDeviceChannels = device => {
    if (app.channels.length > 0) {
      app.channel(app.channels).leave(connection =>
        connection.user._id.equals(device.user._id)
      );
    }
  };
  
  const updateDeviceChannels = device => {
    if (app.channels.length > 0) {
      // Find all connections for this user
      const { connections } = app.channel(app.channels).filter(connection => connection.user._id.equals(device.user._id));
      // Leave all channels
      leaveDeviceChannels(device);
      // Re-join all channels with the updated user information
      connections.forEach(connection => joinDeviceChannels(device, connection));
    }
  };

  app.service('devices').on('created', updateDeviceChannels);
  app.service('devices').on('updated', updateDeviceChannels);
  app.service('devices').on('patched', updateDeviceChannels);
  app.service('devices').on('removed', leaveDeviceChannels);

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
      joinChannels(user, connection);
    }
  });

  app.on('logout', (authResult, { connection }) => {
    app.channel(app.channels).leave(connection);
    app.channel('anonymous').join(connection);
  })

  const publisher = (data, context) => {
    let channel;
    if (context.path === 'clients') {
      channel = app.channel(`clients/${data._id}`);
    } else if (data && data.client) {
      channel = app.channel(`clients/${data.client._id}`);
    } else if (app.channels.length > 0) {
      channel = app.channel(app.channels);
    }
    if (channel) {
      if (context.params && context.params.connection && context.params.connection.user) {
        return channel.filter(connection => connection.user ? connection.user._id.equals(context.params.connection.user._id) : false);
      } if (data && data.user) {
        return channel.filter(connection => connection.user ? connection.user._id.equals(data.user._id) : false);
      } else if (context.data && context.data.user) {
        return channel.filter(connection => connection.user ? connection.user._id.equals(context.data.user._id) : false);
      } else if (context.result && context.result.user) {
        return channel.filter(connection => connection.user ? connection.user._id.equals(context.result.user._id) : false);
      } else if (context.params && context.params.query && context.params.query.user) {
        return channel.filter(connection => connection.user ? connection.user._id.equals(context.params.query.user._id) : false);
      }
    }
    return channel;
  };

  app.publish(publisher);

};
