'use strict';

exports.publicKey = function (req, res) {
    res.set('Content-Type', 'application/x-pem-file').send(req.app.get('keys').public_key);
}

exports.jwks = function (req, res) {
    res.json(req.app.get('keys').keystore.toJWKS());
}