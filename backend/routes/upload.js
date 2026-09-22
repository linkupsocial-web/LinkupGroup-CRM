const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { protect } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for images & videos
});

// @route POST /api/upload
router.post('/', protect, upload.any(), async (req, res) => {
  try {
    console.log('📸 Upload request received on /api/upload');
    const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : req.file;
    if (!uploadedFile) {
      console.warn('⚠️ No file received in upload request');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log(`📁 File to upload: ${uploadedFile.originalname || 'unnamed'} (${Math.round(uploadedFile.size / 1024)} KB, ${uploadedFile.mimetype})`);
    const folder = req.body.folder || 'linkup_cms';

    // Validate Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary credentials are not configured in backend environment.'
      });
    }

    // Upload stream to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: 'auto' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return res.status(500).json({
            success: false,
            message: `Cloudinary upload failed: ${error.message || error}`
          });
        }
        return res.json({
          success: true,
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );
    uploadStream.end(uploadedFile.buffer);
  } catch (err) {
    console.error('Upload handler error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
