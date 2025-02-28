const express = require('express');
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/profile-image', 
  auth, 
  upload.single('image'), 
  userController.updateProfileImage
);

module.exports = router;
