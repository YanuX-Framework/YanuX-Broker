const path = require('path');
const favicon = require('serve-favicon');
const compress = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');

const feathers = require('@feathersjs/feathers');
const configuration = require('@feathersjs/configuration');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');
const primus = require('@feathersjs/primus');

const middleware = require('./middleware');
const services = require('./services');
const appHooks = require('./app.hooks');
const channels = require('./channels');
const mongodb = require('./mongodb');
const mongoose = require('./mongoose');
const authentication = require('./authentication');
const zeroconf = require('./zeroconf');

const app = express(feathers());

// Load app configuration
app.configure(configuration());
// Enable security, CORS, compression, favicon and body parsing
app.use(helmet());
app.use(cors());
app.use(compress());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(favicon(path.join(app.get('public'), 'favicon.ico')));
// Host the public folder
app.use('/', express.static(app.get('public')));

// Set up Plugins and providers
app.configure(express.rest());
app.configure(socketio(function (io) {
    // Registering Socket.io middleware
    io.use(function (socket, next) {
        // Exposing the socket to services and hooks
        socket.feathers.socket = socket;
        next();
    });
}));

app.configure(primus({
    transformer: 'websockets'
}, function (primus) {
    // Do something with primus
    primus.use('feathers-socket', function (req, res) {
        // Exposing the requesting socket
        req.feathers.socket = req;
    });
}));
app.configure(mongodb);
app.configure(mongoose);

// Configure other middleware (see `middleware/index.js`)
app.configure(middleware);
app.configure(authentication);
// Set up our services (see `services/index.js`)
app.configure(services);
// Set up event channels (see channels.js)
app.configure(channels);
// Set up DNS-SD based zeroconf
app.configure(zeroconf);

// Configure a middleware for 404s and the error handler
app.use(express.notFound());

const logger = winston.createLogger({
    transports: [new winston.transports.Console()]
});
app.use(express.errorHandler({ logger }));
app.hooks(appHooks);

module.exports = app;