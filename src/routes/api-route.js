'use strict';

const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api-controller');

//Serving the server's public key
router.route('/public_key').get(apiController.publicKey);

//Serving the server's JWKs
router.route('/jwks').get(apiController.jwks);


module.exports = router;