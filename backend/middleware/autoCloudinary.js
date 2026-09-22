const { uploadBase64Fields } = require('../utils/cloudinaryHelper');

/**
 * Express middleware that automatically scans all incoming POST, PUT, and PATCH bodies
 * for any Base64 encoded images, uploads them to Cloudinary, and replaces them with
 * the permanent Cloudinary HTTPS URL before reaching database handlers.
 */
const autoCloudinary = async (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && typeof req.body === 'object') {
    try {
      const folder = req.baseUrl ? `linkup_cms${req.baseUrl.replace('/api', '')}` : 'linkup_cms';
      await uploadBase64Fields(req.body, folder);
    } catch (err) {
      console.error('[autoCloudinary Middleware Error]:', err.message);
    }
  }
  next();
};

module.exports = autoCloudinary;
