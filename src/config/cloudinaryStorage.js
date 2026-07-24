import cloudinary from './cloudinary.config.js';

/**
 * Multer storage engine that streams uploads straight to Cloudinary.
 *
 * It intentionally sets `file.location` (the secure URL) and `file.key`
 * (the Cloudinary public_id) on the finished file, mirroring the fields
 * multer-s3 used to expose. Every existing consumer reads `file.location`,
 * so swapping the storage engine needs no controller changes.
 *
 * @param {object}   opts
 * @param {string}   opts.folder            Base Cloudinary folder.
 * @param {function} [opts.folderForRequest] (req) => string, overrides folder per request
 *                                           (e.g. to append the user id).
 */
class CloudinaryStorage {
  constructor({ folder, folderForRequest } = {}) {
    this.folder = folder;
    this.folderForRequest = folderForRequest;
  }

  _handleFile(req, file, cb) {
    const folder = this.folderForRequest ? this.folderForRequest(req) : this.folder;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Unique, collision-resistant name inside the folder.
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`
      },
      (error, result) => {
        if (error) return cb(error);
        cb(null, {
          location: result.secure_url, // what controllers read
          key: result.public_id,       // used by deleteImage()
          path: result.secure_url,
          size: result.bytes,
          mimetype: file.mimetype,
          bytes: result.bytes,
          width: result.width,
          height: result.height
        });
      }
    );

    // If the client aborts, tear the Cloudinary stream down too.
    file.stream.on('error', (err) => uploadStream.destroy(err));
    file.stream.pipe(uploadStream);
  }

  _removeFile(req, file, cb) {
    if (!file.key) return cb(null);
    cloudinary.uploader.destroy(file.key).then(() => cb(null)).catch(cb);
  }
}

export const createCloudinaryStorage = (opts) => new CloudinaryStorage(opts);

export default CloudinaryStorage;
