'use strict';

exports.publicKey = function (req, res) {
    res.set('Content-Type', 'application/x-pem-file').send(req.app.get('keys').public_key_pem);
}

exports.jwks = function (req, res) {
    res.json({ keys: [req.app.get('keys').public_jwk] })
}