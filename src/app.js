const path = require('path');
const fs = require('fs');
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

// Config Name
app.set('name', process.env.NAME || app.get('name'));

// Config Host
app.set('host', process.env.HOST || app.get('host'));

// Config Port
app.set('port', parseInt(process.env.PORT) || app.get('port'));

// Config ZeroConf
app.set('zeroconf', process.env.ZEROCONF === 'true' || app.get('portzeroconf'));

// Config MongoDB
app.set('mongodb', process.env.MONGODB_URI || app.get('mongodb'));

//Config Authentication
const configAuthentication = app.get('authentication') || {};
//// Config Authentication JWT Options
configAuthentication.jwtOptions = configAuthentication.jwtOptions || {}
configAuthentication.jwtOptions.audience = process.env.AUTHENTICATION_JWT_OPTIONS_AUDIENCE || configAuthentication.jwtOptions.audience;
configAuthentication.jwtOptions.issuer = process.env.AUTHENTICATION_JWT_OPTIONS_ISSUER || configAuthentication.jwtOptions.issuer;
configAuthentication.jwtOptions.algorithm = process.env.AUTHENTICATION_JWT_OPTIONS_ALGORITHM || configAuthentication.jwtOptions.algorithm;
configAuthentication.jwtOptions.expiresIn = process.env.AUTHENTICATION_JWT_OPTIONS_EXPIRES_IN || configAuthentication.jwtOptions.expiresIn;
configAuthentication.secret = process.env.AUTHENTICATION_SECRET || configAuthentication.secret || fs.readFileSync(path.join(__dirname, '..', 'keys', 'combined.pem'), 'utf8');

//// Config Authentication YanuX Auth
configAuthentication.yanux = configAuthentication.yanux || {};
configAuthentication.yanux.url = process.env.AUTHENTICATION_YANUX_URL || configAuthentication.yanux.url;

app.set('authentication', configAuthentication);

//Config Beacons
const configBeacons = app.get('beacons') || {};
configBeacons.maxInactivityTime = parseInt(process.env.BEACONS_MAX_INACTIVITY_TIME) || configBeacons.maxInactivityTime;
configBeacons.avgRssiThreshold = parseInt(process.env.BEACONS_AVG_RSSI_THRESHOLD) || configBeacons.avgRssiThreshold;
app.set('beacons', configBeacons);

// Config Public
app.set('public', process.env.PUBLIC || app.get('public'));

// Config Paginate
const configPaginate = app.get('paginate') || {};
configPaginate.default = parseInt(process.env.PAGINATE_DEFAULT) || configPaginate.default;
configPaginate.max = parseInt(process.env.PAGINATE_MAX) || configPaginate.max;
app.set('paginate', configPaginate);

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
        socket.feathers._socket = socket;
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
if (app.get('zeroconf')) {
    app.configure(zeroconf);
}

// Configure a middleware for 404s and the error handler
app.use(express.notFound());

const logger = winston.createLogger({
    transports: [new winston.transports.Console()]
});
app.use(express.errorHandler({ logger }));
app.hooks(appHooks);

module.exports = app;