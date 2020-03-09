'use strict';

const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api-controller');

//Serving the server's public key
router.route('/public_key').get(apiController.publicKey);

module.exports = router;