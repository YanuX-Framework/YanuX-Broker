module.exports = function (app) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return;
  }

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
      // Add the user to a its specific channels
      app.channel(`users/${user._id}`).join(connection);
      app.channel(`users/${user.email}`).join(connection);

      // Channels can be named anything and joined on any condition 
      // E.g. to send real-time events only to admins use
      // if(user.isAdmin) { app.channel('admins').join(connection); }

      // If the user has joined e.g. chat rooms
      // if(Array.isArray(user.rooms)) user.rooms.forEach(room => app.channel(`rooms/${room.id}`).join(channel));

      // Easily organize users by email and userid for things like messaging
      // app.channel(`emails/${user.email}`).join(channel);
      // app.channel(`userIds/$(user.id}`).join(channel);
    }
  });

  // eslint-disable-next-line no-unused-vars
  /* app.publish((data, hook) => {
    // Here you can add event publishers to channels set up in `channels.js`
    // To publish only for a specific event use `app.publish(eventname, () => {})`
    console.log('Publishing all events to all authenticated users. See `channels.js` and https://docs.feathersjs.com/api/channels.html for more information.'); // eslint-disable-line
    // e.g. to publish all service events to all authenticated users use
    return app.channel('authenticated');
  }); */

  const genericPublish = (data, context) => {
    if (data.to) {
      if (data.to.channel) {
        return app.channel(data.channel);
      } else if (data.to.user && data.to.device && data.to.instance) {
        return app.channel(`users/${data.to.user}/devices/${data.to.device}/instances/${data.to.instance}`);
      } else if (data.to.user && data.to.instance) {
        return app.channel(`users/${data.to.user}/instances/${data.to.instance}`);
      } else if (data.to.user && data.to.device) {
        return app.channel(`users/${data.to.user}/devices/${data.to.instance}`);
      } else if (data.to.instance) {
        return app.channel(`instances/${data.to.instance}`);
      } else if (data.to.user && data.to.device) {
        return app.channel(`users/${data.to.user}/devices/${data.to.device}`);
      } else if (data.to.user) {
        return app.channel(`users/${data.to.user}`);
      } else if (data.to.device) {
        return app.channel(`devices/${data.to.device}`);
      } else if (data.to.userId && data.to.deviceUuid && data.to.instanceUuid) {
        return app.channel(`users/${data.to.userId}/devices/${data.to.deviceUuid}/instances/${data.to.instanceUuid}`);
      } else if (data.to.userId && data.to.instanceUuid) {
        return app.channel(`users/${data.to.userId}/instances/${data.to.instanceUuid}`);
      } else if (data.to.userId && data.to.deviceUuid) {
        return app.channel(`users/${data.to.userId}/devices/${data.to.deviceUuid}`);
      } else if (data.to.instanceUuid) {
        return app.channel(`instances/${data.to.instanceUuid}`);
      } else if (data.to.userId && data.to.deviceUuid) {
        return app.channel(`users/${data.to.userId}/devices/${data.to.deviceUuid}`);
      } else if (data.to.userId) {
        return app.channel(`users/${data.to.userId}`);
      } else if (data.to.deviceUuid) {
        return app.channel(`devices/${data.to.deviceUuid}`);
      }
    } else if (context.params && context.params.user) {
      return app.channel(`users/${context.params.user.email}`);
    }
  };

  app.on('logout', (authResult, { connection }) => {
    app.channel(app.channels).leave(connection);
    app.channel('anonymous').join(connection);
  })

  // Publishing events from all events to the user specific channel.
  app.publish(genericPublish);
  /*
  app.service('users').publish(genericPublish);
  app.service('clients').publish(genericPublish);
  app.service('events').publish(genericPublish);
  app.service('resources').publish(genericPublish);
  app.service('beacons').publish(genericPublish);
  app.service('instances').publish(genericPublish);
  app.service('devices').publish(genericPublish);
  */

  // Here you can also add service specific event publishers
  // e.g. the publish the `users` service `created` event to the `admins` channel
  // app.service('users').publish('created', () => app.channel('admins'));

  // With the userid and email organization from above you can easily select involved users
  // app.service('messages').publish(() => {
  //   return [
  //     app.channel(`userIds/${data.createdBy}`),
  //     app.channel(`emails/${data.recipientEmail}`)
  //   ];
  // });
};
