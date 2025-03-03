import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import s3Client from '../config/s3.config.js';

export const uploadImage = async (file, userId, type = 'profile') => {
  try {
    if (!file || !file.location) {
      throw new ApiError(400, 'No valid image file provided');
    }

    logger.info({
      message: 'Image upload successful',
      type,
      userId,
      fileInfo: {
        location: file.location,
        mimetype: file.mimetype,
        size: file.size
      }
    });

    return file.location;
  } catch (error) {
    logger.error('Error in uploadImage:', {
      error: error.message,
      userId,
      type
    });
    throw error;
  }
};

export const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    // Extract key from S3 URL
    const key = imageUrl.split('.com/')[1];
    if (!key) return;

    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    }));

    logger.info({
      message: 'Image deleted successfully',
      imageUrl
    });
  } catch (error) {
    logger.error('Error deleting image:', {
      error: error.message,
      imageUrl
    });
    // Don't throw error for deletion failures
  }
};

export const validateImage = (file) => {
  if (!file) {
    throw new ApiError(400, 'Image file is required');
  }

  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    throw new ApiError(400, 'Image file size must be less than 2MB');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new ApiError(400, 'Invalid file type. Only JPEG, PNG and WEBP allowed');
  }

  return true;
};
