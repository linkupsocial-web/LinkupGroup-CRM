const cloudinary = require('../config/cloudinary');

/**
 * Recursively scans an object for any Base64 data URLs (data:image/...),
 * uploads them to Cloudinary, and replaces the value with the secure Cloudinary URL.
 * 
 * @param {any} obj - Object, array, or string to process
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<any>}
 */
async function uploadBase64Fields(obj, folder = 'linkup_cms') {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string' && obj.startsWith('data:image')) {
      try {
        const result = await cloudinary.uploader.upload(obj, {
          folder: folder,
          resource_type: 'image'
        });
        return result.secure_url;
      } catch (err) {
        console.error('Auto Cloudinary upload error:', err.message);
        return obj;
      }
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = await uploadBase64Fields(obj[i], folder);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string' && val.startsWith('data:image')) {
      try {
        console.log(`[Auto-Upload] Detected Base64 image in field "${key}". Uploading to Cloudinary...`);
        const result = await cloudinary.uploader.upload(val, {
          folder: folder,
          resource_type: 'image'
        });
        console.log(`[Auto-Upload] Success! Cloudinary URL: ${result.secure_url}`);
        obj[key] = result.secure_url;
        if (obj.publicId !== undefined) {
          obj.publicId = result.public_id;
        }
      } catch (err) {
        console.error(`[Auto-Upload] Cloudinary upload failed for field "${key}":`, err.message);
      }
    } else if (typeof val === 'object' && val !== null) {
      obj[key] = await uploadBase64Fields(val, folder);
    }
  }

  return obj;
}

module.exports = {
  uploadBase64Fields
};
