import multer from 'multer';
import { ApiError } from './error.middleware.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';
import { createCloudinaryStorage } from '../config/cloudinaryStorage.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const imageFileFilter = (req, file, cb) => {
  logger.info(chalk.blue('🔍 Validating file:'), {
    fieldname: chalk.cyan(file.fieldname),
    originalname: chalk.yellow(file.originalname),
    mimetype: chalk.magenta(file.mimetype)
  });

  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG and WEBP allowed'), false);
  }
  cb(null, true);
};

// Cloudinary folders mirror the old S3 key prefixes so the storage layout is familiar.
const profileStorage = createCloudinaryStorage({
  folderForRequest: (req) => `profile-images/${req.user.userId}`
});
const productStorage = createCloudinaryStorage({
  folderForRequest: (req) => `products/${req.user.userId}`
});
const reviewStorage = createCloudinaryStorage({
  folderForRequest: (req) => `reviews/${req.user.userId}`
});

// Profile image upload middleware
export const uploadSingleImage = (req, res, next) => {
  logger.info(chalk.blue('📤 Starting image upload...'));

  const upload = multer({
    storage: profileStorage,
    limits: {
      fileSize: 2 * 1024 * 1024 // 2MB
    },
    fileFilter: imageFileFilter
  }).single('image');

  upload(req, res, (err) => {
    logger.info(chalk.blue('📝 Upload request details:'), {
      hasFile: !!req.file
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

      return res.status(err.statusCode || 400).json({
        message: err.message,
        code: 'UPLOAD_ERROR'
      });
    }

    if (!req.file) {
      logger.error(chalk.red('❌ No file in request'), {
        contentType: req.headers['content-type']
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
6. Check file size (max 2MB)`
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

// Product images upload middleware (at least one image required)
export const uploadProductImages = (req, res, next) => {
  const upload = multer({
    storage: productStorage,
    limits: {
      fileSize: 40 * 1024 * 1024, // 40MB per file
      files: 8 // Maximum 8 files
    },
    fileFilter: imageFileFilter
  }).array('images', 8);

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'File too large. Maximum size is 40MB per image',
          code: 'FILE_TOO_LARGE',
          limit: '40MB'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          message: 'Too many files. Maximum is 8 images',
          code: 'TOO_MANY_FILES',
          limit: 8
        });
      }
      return res.status(400).json({
        message: `Upload error: ${err.message}`,
        code: err.code
      });
    }

    if (err) {
      logger.error(chalk.red('❌ Upload error:'), err);
      return res.status(err.statusCode || 500).json({ message: err.message || 'Error uploading files' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'At least one image is required',
        code: 'NO_FILES'
      });
    }

    next();
  });
};

// Product images upload middleware for updates (allows zero images)
export const updateProductImages = (req, res, next) => {
  const upload = multer({
    storage: productStorage,
    limits: {
      fileSize: 40 * 1024 * 1024, // 40MB per file
      files: 8 // Maximum 8 files
    },
    fileFilter: imageFileFilter
  }).array('images', 8);

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'File too large. Maximum size is 40MB per image',
          code: 'FILE_TOO_LARGE',
          limit: '40MB'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          message: 'Too many files. Maximum is 8 images',
          code: 'TOO_MANY_FILES',
          limit: 8
        });
      }
      return res.status(400).json({
        message: `Upload error: ${err.message}`,
        code: err.code
      });
    }

    if (err) {
      logger.error(chalk.red('❌ Upload error:'), err);
      return res.status(err.statusCode || 500).json({ message: err.message || 'Error uploading files' });
    }

    next();
  });
};

// Review images upload middleware
export const uploadReviewImages = multer({
  storage: reviewStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

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
