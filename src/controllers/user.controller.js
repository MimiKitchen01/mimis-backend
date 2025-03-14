import User from '../models/user.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';
import * as imageService from '../services/image.service.js';

export const updateProfile = async (req, res) => {
  try {
    logger.info(chalk.blue('📝 Profile update request:'),
      chalk.cyan(JSON.stringify(req.body, null, 2))
    );

    const allowedUpdates = [
      'fullName',
      'phoneNumber',
      'dateOfBirth',
      'imageUrl'
    ];

    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update =>
      allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
      throw new ApiError(400, 'Invalid updates. Can only update: ' + allowedUpdates.join(', '));
    }

    if (req.body.email) {
      throw new ApiError(400, 'Email cannot be changed');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    updates.forEach(update => {
      user[update] = req.body[update];
    });

    await user.save();

    logger.info(chalk.green('✅ Profile updated successfully for user:'),
      chalk.yellow(user.email)
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
        imageUrl: user.imageUrl
      }
    });
  } catch (error) {
    logger.error(
      chalk.red('❌ Profile update error:'),
      chalk.yellow(error.message),
      chalk.gray('\n', error.stack)
    );
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Error in updatePassword:', error);
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const updateProfileImage = async (req, res) => {
  try {
    // Log the incoming request
    logger.info('Update profile image request:', {
      file: req.file,
      userId: req.user.userId
    });

    // Validate file exists
    if (!req.file) {
      throw new ApiError(400, 'Please upload an image file');
    }

    // Validate file has location
    if (!req.file.location) {
      throw new ApiError(500, 'File upload failed - no URL received');
    }

    logger.info(chalk.blue('📝 Profile image update:'), {
      userId: chalk.cyan(req.user.userId),
      file: {
        originalname: req.file.originalname,
        size: `${(req.file.size / 1024).toFixed(2)}KB`,
        mimetype: req.file.mimetype,
        location: req.file.location
      }
    });

    // Update user's profile image
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { imageUrl: req.file.location },
      { new: true }
    ).select('-password -otp');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      message: 'Profile image updated successfully',
      imageUrl: req.file.location,
      user
    });
  } catch (error) {
    logger.error(chalk.red('❌ Profile image update error:'), error);
    res.status(error.statusCode || 400).json({
      message: error.message,
      help: 'Make sure to upload an image file using form-data with key "image"',
      example: {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer your-token'
        },
        body: {
          type: 'form-data',
          key: 'image',
          value: '[Select an image file]'
        }
      }
    });
  }
};
