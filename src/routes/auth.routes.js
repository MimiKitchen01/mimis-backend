const express = require('express');
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOTP);
router.post('/login', authController.login);
router.get('/me', auth, authController.getProfile);

module.exports = router;
