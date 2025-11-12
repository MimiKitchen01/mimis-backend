import User from '../models/user.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import * as imageService from '../services/image.service.js';
import chalk from 'chalk';

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
  logger.info(chalk.blue('🔍 Profile Image Update Request:'), {
    headers: {
      contentType: chalk.cyan(req.headers['content-type']),
      contentLength: chalk.yellow(req.headers['content-length'])
    },
    file: req.file ? {
      fieldname: chalk.cyan(req.file.fieldname),
      originalname: chalk.yellow(req.file.originalname),
      mimetype: chalk.magenta(req.file.mimetype),
      size: chalk.gray(`${(req.file.size / 1024).toFixed(2)}KB`),
      location: chalk.green(req.file.location)
    } : chalk.red('No file received'),
    body: req.body,
    userId: chalk.cyan(req.user.userId)
  });

  try {
    if (!req.file) {
      throw new ApiError(400, 'No image file uploaded');
    }

    // Update user's profile image
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { imageUrl: req.file.location },
      { new: true }
    ).select('-password');

    res.json({
      message: 'Profile image updated successfully',
      imageUrl: req.file.location,
      user
    });
  } catch (error) {
    logger.error(chalk.red('❌ Profile Image Update Error:'), error);
    res.status(error.statusCode || 400).json({
      message: error.message,
      help: 'Make sure to send an image file using form-data with key "image"'
    });
  }
};

export const softDeleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!user.isActive) {
      return res.status(200).json({ message: 'Account does not exist' });
    }

    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Error in softDeleteAccount:', error);
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};
