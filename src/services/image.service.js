import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import s3Client from '../config/s3.config.js';
import cloudinary from '../config/cloudinary.config.js';

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

const isCloudinaryUrl = (url) => /res\.cloudinary\.com/.test(url);

/**
 * Turn a Cloudinary delivery URL into the public_id needed to delete it.
 * e.g. https://res.cloudinary.com/demo/image/upload/v1710000/products/42/173-9.jpg
 *   -> products/42/173-9
 */
const cloudinaryPublicId = (url) => {
  const afterUpload = url.split('/upload/')[1];
  if (!afterUpload) return null;
  // Drop a leading version segment (v1234567890/) if present.
  const withoutVersion = afterUpload.replace(/^v\d+\//, '');
  // Drop the file extension.
  return withoutVersion.replace(/\.[^/.]+$/, '');
};

export const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    if (isCloudinaryUrl(imageUrl)) {
      const publicId = cloudinaryPublicId(imageUrl);
      if (!publicId) return;

      await cloudinary.uploader.destroy(publicId);
      logger.info({ message: 'Cloudinary image deleted', publicId });
      return;
    }

    // Legacy images still hosted on S3 — keep deleting those correctly.
    const key = imageUrl.split('.com/')[1];
    if (!key) return;

    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    }));

    logger.info({ message: 'S3 image deleted successfully', imageUrl });
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
