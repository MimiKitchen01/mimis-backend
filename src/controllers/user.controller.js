import User from '../models/user.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import * as imageService from '../services/image.service.js';

export const updateProfile = async (req, res) => {
  try {
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
    logger.error('Error in updateProfile:', error);
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
    const { file } = req;
    
    // Validate image
    imageService.validateImage(file);

    // Get user
    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Store old image URL for cleanup
    const oldImageUrl = user.imageUrl;

    // Upload new image
    const imageUrl = await imageService.uploadImage(file, user._id, 'profile');
    
    // Update user profile
    user.imageUrl = imageUrl;
    await user.save();

    // Delete old image if exists
    if (oldImageUrl) {
      await imageService.deleteImage(oldImageUrl);
    }

    res.json({
      message: 'Profile image updated successfully',
      imageUrl: user.imageUrl
    });
  } catch (error) {
    logger.error('Error in updateProfileImage:', {
      error: error.message,
      userId: req.user?.userId
    });
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};
