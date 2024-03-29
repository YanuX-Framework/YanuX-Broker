const path = require('path');
const favicon = require('serve-favicon');
const compress = require('compression');
const helmet = require('helmet');
const cors = require('cors');

const feathers = require('@feathersjs/feathers');
const configuration = require('@feathersjs/configuration');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');
const swagger = require('feathers-swagger');

const configure = require('./configure');
const middleware = require('./middleware');
const services = require('./services');
const appHooks = require('./app.hooks');
const channels = require('./channels');
const mongoose = require('./mongoose');
const authentication = require('./authentication');
const zeroconf = require('./zeroconf');
const logger = require('./logger');

const app = express(feathers());

// Load app configuration
app.configure(configuration());
// Custom configuration step that loads some extra information from the configuration files and environment variables
app.configure(configure);

// Enable security, CORS, compression, favicon and body parsing
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compress());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(favicon(path.join(app.get('public'), 'favicon.ico')));
// Host the public folder
app.use('/', express.static(app.get('public')));

// Expose an Express-based routes
const api = require('./routes/api-route');
app.use('/api', api);

// Set up Plugins and providers
app.configure(express.rest());

app.configure(swagger({
    openApiVersion: 3,
    docsPath: '/docs',
    uiIndex: path.join(__dirname, 'docs', 'index.html'),
    ignore: {
        paths: ['authentication']
    },
    specs: {
        info: {
            title: 'YanuX Broker API',
            description: 'YanuX Broker\'s REST API',
            version: '1.0.0',
        },
    },
}))

// Socket.io
app.configure(socketio(function (io) {
    io.origins((_, callback) => {
        callback(null, true);
    });
    // Registering Socket.io middleware
    io.use(function (socket, next) {
        // Exposing the socket to services and hooks
        socket.feathers._socket = socket;
        next();
    });
}));

// Mongoose
app.configure(mongoose);

// Configure other middleware (see `middleware/index.js`)
app.configure(middleware);

// Set up authentication
app.configure(authentication);

// Set up our services (see `services/index.js`)
app.configure(services);

// Set up event channels (see channels.js)
app.configure(channels);

// Set up DNS-SD based zeroconf
if (app.get('zeroconf')) {
    app.configure(zeroconf);
}

// Configure a middleware for 404s and the error handler
app.use(express.notFound());
app.use(express.errorHandler({ logger }));
app.hooks(appHooks);

module.exports = app;