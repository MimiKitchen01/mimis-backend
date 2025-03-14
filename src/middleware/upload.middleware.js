import multer from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import path from 'path';
import { ApiError } from './error.middleware.js';
import s3Client from '../config/s3.config.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

const fileFilter = (req, file, cb) => {
  logger.info({
    message: 'Validating file upload',
    mimetype: file.mimetype,
    originalname: file.originalname,
    fieldname: file.fieldname
  });

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG and WEBP allowed'), false);
  }
  cb(null, true);
};

// Create base multer S3 configuration
const createS3Storage = (folderPath) =>
  multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      logger.info('Processing file upload:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        fieldname: file.fieldname
      });

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname) || '.jpg';
      const key = `${folderPath}/${req.user.userId}/${uniqueSuffix}${ext}`;

      logger.info('Generated S3 key:', { key });
      cb(null, key);
    },
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        userId: req.user.userId,
        originalName: file.originalname
      });
    }
  });

// Create the multer upload instance
const uploadSingleImage = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        userId: req.user.userId
      });
    },
    key: (req, file, cb) => {
      try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const key = `profile-images/${req.user.userId}/${uniqueSuffix}${ext}`;
        
        logger.info(chalk.blue('🔑 Generated S3 key:'), chalk.cyan(key));
        cb(null, key);
      } catch (error) {
        logger.error('Error generating key:', error);
        cb(new Error('Error generating file key'));
      }
    }
  }),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: (req, file, cb) => {
    try {
      logger.info(chalk.blue('🔍 Validating file:'), {
        fieldname: chalk.cyan(file.fieldname),
        originalname: chalk.yellow(file.originalname),
        mimetype: chalk.magenta(file.mimetype)
      });

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(file.mimetype)) {
        return cb(new Error('Only JPEG, PNG and WEBP files are allowed'));
      }

      cb(null, true);
    } catch (error) {
      logger.error('File filter error:', error);
      cb(error);
    }
  }
}).single('image');

// Export the middleware function
export const handleProfileImageUpload = (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    if (err) {
      logger.error('Upload error:', err);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: 'File size too large. Maximum size is 2MB',
            code: 'FILE_TOO_LARGE'
          });
        }
        return res.status(400).json({
          message: `Upload error: ${err.message}`,
          code: err.code
        });
      }
      
      return res.status(400).json({
        message: err.message || 'Error uploading file',
        code: 'UPLOAD_ERROR',
        help: 'Make sure to use form-data with key "image" and select a valid image file'
      });
    }

    // Log the received file
    logger.info('File received:', {
      file: req.file,
      body: req.body
    });

    next();
  });
};

// Product images upload middleware
export const uploadProductImages = (req, res, next) => {
  const upload = multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.AWS_BUCKET_NAME,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: (req, file, cb) => {
        cb(null, {
          fieldName: file.fieldname,
          userId: req.user.userId
        });
      },
      key: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        const filename = `${uniqueSuffix}${ext}`;
        const key = `products/${req.user.userId}/${filename}`;
        cb(null, key);
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 8
    },
    fileFilter
  }).array('images', 8);

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      logger.error('Multer error:', err);
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    } else if (err) {
      logger.error('Unknown upload error:', err);
      return res.status(500).json({ message: 'Error uploading files' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    if (req.files.length > 8) {
      return res.status(400).json({ message: 'Maximum 8 images allowed' });
    }

    next();
  });
};

// Helper function for image URLs
export const formatImageUrls = (files) => {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'At least one image is required');
  }

  return {
    imageUrl: files[0].location,
    additionalImages: files.slice(1).map(file => file.location)
  };
};
