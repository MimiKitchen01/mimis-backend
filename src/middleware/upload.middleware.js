import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import path from 'path';
import { ApiError } from './error.middleware.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG and WEBP allowed'), false);
    return;
  }
  cb(null, true);
};

export const uploadToS3 = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    key: (req, file, cb) => {
      const fileName = `${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, `products/${fileName}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 8 // Maximum 8 files (1 main + 7 additional)
  },
  fileFilter
});

export const formatImageUrls = (files) => {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'At least 2 images are required');
  }
  if (files.length > 8) {
    throw new ApiError(400, 'Maximum 8 images allowed');
  }

  return {
    imageUrl: files[0].location,
    additionalImages: files.slice(1).map(file => file.location)
  };
};
