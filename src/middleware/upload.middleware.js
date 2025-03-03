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
  logger.info({
    message: 'Starting image upload',
    contentType: req.headers['content-type'],
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    files: req.files,
    rawBody: req.rawBody,
  });

  const upload = multer({
    storage: createS3Storage('profiles'),
    limits: { 
      fileSize: 2 * 1024 * 1024, // 2MB 
      fieldSize: 10 * 1024 * 1024 // 10MB field size limit
    },
    fileFilter
  }).single('image');

  // Add raw body parsing
  const rawBody = [];
  req.on('data', (chunk) => {
    rawBody.push(chunk);
  });

  req.on('end', () => {
    req.rawBody = Buffer.concat(rawBody).toString();
  });

  upload(req, res, (err) => {
    logger.info('Upload attempt:', {
      headers: req.headers,
      file: req.file,
      error: err?.message
    });

    if (err instanceof multer.MulterError) {
      logger.error('Multer error:', err);
      return res.status(400).json({
        message: 'File upload error',
        details: err.message,
        code: 'MULTER_ERROR',
        help: 'Make sure you are uploading a file less than 2MB'
      });
    }

    if (err) {
      logger.error('Upload error:', err);
      return res.status(500).json({
        message: 'Error uploading file',
        code: 'UPLOAD_ERROR'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded',
        code: 'NO_FILE',
        help: 'In Postman: Use form-data, key name should be "image", and select a file using the "Select Files" button'
      });
    }

    logger.info('File uploaded successfully:', {
      filename: req.file.originalname,
      location: req.file.location
    });

    next();
  });
};

// Product images upload middleware
export const uploadProductImages = (req, res, next) => {
  const upload = multer({
    storage: createS3Storage('products'),
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
