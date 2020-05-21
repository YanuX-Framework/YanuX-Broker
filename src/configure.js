const fs = require('fs');
const path = require('path');
const jose = require('jose');

module.exports = app => {
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

    // Config Keys
    configKeys = app.get('keys') || {};
    configKeys.private_key = process.env.KEYS_PRIVATE_KEY ? process.env.KEYS_PRIVATE_KEY : fs.readFileSync(path.normalize(configKeys.private_key_path), 'utf8');
    configKeys.public_key = process.env.KEYS_PUBLIC_KEY ? process.env.KEYS_PUBLIC_KEY : fs.readFileSync(path.normalize(configKeys.public_key_path), 'utf8');
    configKeys.combined_key = process.env.KEYS_COMBINED_KEY ? process.env.KEYS_COMBINED_KEY : fs.readFileSync(path.normalize(configKeys.combined_key_path), 'utf8');
    configKeys.keystore = new jose.JWKS.KeyStore();
    configKeys.private_jwk = jose.JWK.asKey(configKeys.private_key);
    configKeys.public_jwk = jose.JWK.asKey(configKeys.public_key);
    configKeys.combined_jwk = jose.JWK.asKey(configKeys.public_key);
    configKeys.keystore.add(configKeys.private_jwk);
    //configKeys.keystore.add(configKeys.public_jwk);
    //configKeys.keystore.add(configKeys.combined_jwk);
    app.set('keys', configKeys);

    // Config Authentication
    const configAuthentication = app.get('authentication') || {};

    //// Config Authentication JWT Options
    configAuthentication.jwtOptions = configAuthentication.jwtOptions || {}
    configAuthentication.jwtOptions.header =  configAuthentication.jwtOptions.header || {};
    configAuthentication.jwtOptions.header.typ = process.env.AUTHENTICATION_JWT_OPTIONS_HEADER_TYP || configAuthentication.jwtOptions.header.typ;
    configAuthentication.jwtOptions.header.jku = process.env.AUTHENTICATION_JWT_OPTIONS_HEADER_JKU || configAuthentication.jwtOptions.header.jku;
    configAuthentication.jwtOptions.audience = process.env.AUTHENTICATION_JWT_OPTIONS_AUDIENCE || configAuthentication.jwtOptions.audience;
    configAuthentication.jwtOptions.issuer = process.env.AUTHENTICATION_JWT_OPTIONS_ISSUER || configAuthentication.jwtOptions.issuer;
    configAuthentication.jwtOptions.algorithm = process.env.AUTHENTICATION_JWT_OPTIONS_ALGORITHM || configAuthentication.jwtOptions.algorithm;
    configAuthentication.jwtOptions.expiresIn = process.env.AUTHENTICATION_JWT_OPTIONS_EXPIRES_IN || configAuthentication.jwtOptions.expiresIn;
    configAuthentication.secret = process.env.AUTHENTICATION_SECRET || configAuthentication.secret || configKeys.combined_key;

    //// Config Authentication YanuX Auth
    configAuthentication.yanux = configAuthentication.yanux || {};
    configAuthentication.yanux.url = process.env.AUTHENTICATION_YANUX_URL || configAuthentication.yanux.url;

    app.set('authentication', configAuthentication);

    // Config Beacons
    const configBeacons = app.get('beacons') || {};
    configBeacons.maxInactivityTime = parseInt(process.env.BEACONS_MAX_INACTIVITY_TIME) || configBeacons.maxInactivityTime;
    configBeacons.avgRssiThreshold = parseInt(process.env.BEACONS_AVG_RSSI_THRESHOLD) || configBeacons.avgRssiThreshold;
    app.set('beacons', configBeacons);

    // Config Paginate
    const configPaginate = app.get('paginate') || {};
    configPaginate.default = parseInt(process.env.PAGINATE_DEFAULT) || configPaginate.default;
    configPaginate.max = parseInt(process.env.PAGINATE_MAX) || configPaginate.max;
    app.set('paginate', configPaginate);

    return app;
}