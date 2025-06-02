import express from 'express';
import * as userController from '../controllers/user.controller.js';
import auth from '../middleware/auth.js';
import { uploadSingleImage } from '../middleware/upload.middleware.js'; // Changed from uploadToS3
import logger from '../utils/logger.js';


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
 *     summary: Upload user profile image
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image (JPEG, PNG, WEBP - max 2MB)
 *     responses:
 *       200:
 *         description: Profile image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 imageUrl:
 *                   type: string
 *       400:
 *         description: Invalid request or no file uploaded
 *       413:
 *         description: File too large
 */
router.post(
  '/profile-image',
  auth,
  uploadSingleImage,  // Changed from uploadToS3.single('image')
  (req, res, next) => {
    logger.info({
      message: 'Processing profile image upload',
      hasFile: !!req.file,
      userId: req.user.userId
    });
    userController.updateProfileImage(req, res, next);
  }
);

/**
 * @swagger
 * /api/users/profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch('/profile', auth, userController.updateProfile);

/**
 * @swagger
 * /api/users/password:
 *   patch:
 *     summary: Update user password
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password updated successfully
 */
router.patch('/password', auth, userController.updatePassword);

export default router;
