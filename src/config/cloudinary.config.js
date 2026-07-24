import { v2 as cloudinary } from 'cloudinary';
import logger from '../utils/logger.js';

// The Cloudinary SDK auto-reads CLOUDINARY_URL from the environment, but we
// configure explicitly so both that single-var form and the individual-var
// form work, and so a missing configuration fails loudly at startup rather
// than silently on the first upload.
if (process.env.CLOUDINARY_URL) {
  // cloudinary://<api_key>:<api_secret>@<cloud_name> — parsed by the SDK itself.
  cloudinary.config({ secure: true });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

const { cloud_name } = cloudinary.config();
if (!cloud_name) {
  logger.error(
    'Cloudinary is not configured. Set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME / ' +
    'CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET). Image uploads will fail until this is set.'
  );
} else {
  logger.info(`☁️  Cloudinary configured for cloud "${cloud_name}"`);
}

export default cloudinary;
