const express = require('express');
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

const router = express.Router();

/**
 * @swagger
 * /api/users/profile-image:
 *   post:
 *     summary: Upload profile image
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile image updated successfully
 *       400:
 *         description: No image uploaded
 *       401:
 *         description: Not authenticated
 */
router.post('/profile-image', 
  auth, 
  upload.single('image'), 
  userController.updateProfileImage
);

module.exports = router;
