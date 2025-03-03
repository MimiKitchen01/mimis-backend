import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { ApiError } from './error.middleware.js';
import s3Client from '../config/s3.config.js';
import logger from '../utils/logger.js';

const fileFilter = (req, file, cb) => {
  logger.info({
    message: 'Validating file upload',
    mimetype: file.mimetype,
    originalname: file.originalname
  });

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG and WEBP allowed'), false);
  }
  cb(null, true);
};

const createMulterS3Upload = (folderPath) => {
  return multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.AWS_BUCKET_NAME,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${folderPath}/${req.user.userId}/${uniqueSuffix}${ext}`);
      },
      metadata: (req, file, cb) => {
        cb(null, { userId: req.user.userId });
      }
    }),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter
  });
};

// Export configurations
export const uploadSingleImage = createMulterS3Upload('profiles').single('image');
export const uploadProductImages = createMulterS3Upload('products').array('images', 8);

// Helper function for image URLs
export const formatImageUrls = (files) => {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'At least one image is required');
  }

  if (Array.isArray(files)) {
    return {
      imageUrl: files[0].location,
      additionalImages: files.slice(1).map(file => file.location)
    };
  }

  return { imageUrl: files.location };
};
