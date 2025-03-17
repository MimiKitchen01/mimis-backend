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

// Profile image upload middleware
export const uploadSingleImage = (req, res, next) => {
  logger.info(chalk.blue('📤 Starting image upload...'));

  // Create multer instance with explicit configurations
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
        const key = `profile-images/${req.user.userId}/${filename}`;

        logger.info(chalk.blue('🔑 Generated S3 key:'), chalk.cyan(key));
        cb(null, key);
      }
    }),
    limits: {
      fileSize: 2 * 1024 * 1024 // 2MB
    },
    fileFilter: (req, file, cb) => {
      // Log the incoming file details
      logger.info(chalk.blue('🔍 Validating file:'), {
        fieldname: chalk.cyan(file.fieldname),
        originalname: chalk.yellow(file.originalname),
        mimetype: chalk.magenta(file.mimetype)
      });

      // Validate file type
      if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
        return cb(new ApiError(400, 'Only JPEG, PNG and WEBP files are allowed'));
      }
      cb(null, true);
    }
  }).single('image');

  // Handle the upload with detailed logging
  upload(req, res, (err) => {
    // Log the entire request for debugging
    logger.info(chalk.blue('📝 Upload request details:'), {
      headers: req.headers,
      body: req.body,
      file: req.file
    });

    if (err) {
      logger.error(chalk.red('❌ Upload error:'), err);

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
        message: err.message,
        code: 'UPLOAD_ERROR'
      });
    }

    if (!req.file) {
      logger.error(chalk.red('❌ No file in request'), {
        contentType: req.headers['content-type'],
        body: req.body
      });

      return res.status(400).json({
        message: 'No file uploaded',
        code: 'NO_FILE',
        help: `Troubleshooting steps:
1. Use form-data in Postman
2. Set key name exactly to "image"
3. Click "Select Files" button
4. Select an image file (JPEG, PNG, or WEBP)
5. Don't set Content-Type manually
6. Check file size (max 2MB)
7. Verify request headers:
   Current Content-Type: ${req.headers['content-type']}`,
        example: {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer your-token',
          },
          body: {
            type: 'form-data',
            key: 'image',
            value: '[Select File]'
          }
        }
      });
    }

    logger.info(chalk.green('✅ File uploaded successfully:'), {
      location: chalk.cyan(req.file.location),
      size: chalk.yellow(`${(req.file.size / 1024).toFixed(2)}KB`),
      mimetype: chalk.magenta(req.file.mimetype)
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
