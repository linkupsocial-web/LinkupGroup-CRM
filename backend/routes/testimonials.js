const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Testimonial = require('../models/Testimonial');
const { protect } = require('../middleware/auth');
const { testimonialCard, isEmbeddedDataUrl } = require('../utils/listPayload');

// @route GET /api/testimonials
router.get('/', async (req, res) => {
  try {
    const { companyId, includeHidden, summary } = req.query;
    const filter = { isDeleted: false };
    
    if (companyId && companyId !== 'all' && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = companyId;
    }
    
    if (!includeHidden) filter.isVisible = true;
    if (summary === 'true') {
      const count = await Testimonial.countDocuments(filter);
      return res.json({ success: true, count, data: [] });
    }

    const testimonials = await Testimonial.find(filter)
      .select('-profileImage')
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
    res.json({ success: true, count: testimonials.length, data: testimonials.map((item) => testimonialCard(item, '/api/testimonials')) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/image', async (req, res) => {
  try {
    const item = await Testimonial.findById(req.params.id).select('profileImage isDeleted').lean();
    const image = item?.profileImage?.url;
    if (!item || item.isDeleted || !image) return res.status(404).end();
    if (!isEmbeddedDataUrl(image)) return res.redirect(image);
    const [metadata, encoded] = image.split(',', 2);
    res.set('Cache-Control', 'public, max-age=86400');
    res.type(metadata.match(/^data:([^;]+)/)?.[1] || 'image/jpeg').send(Buffer.from(encoded, 'base64'));
  } catch (err) { res.status(400).end(); }
});

// @route GET /api/testimonials/:id
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }
    const testimonial = await Testimonial.findOne({ _id: req.params.id, isDeleted: false });
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    res.json({ success: true, data: testimonial });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/testimonials
router.post('/', protect, async (req, res) => {
  try {
    const testimonial = await Testimonial.create(req.body);
    res.status(201).json({ success: true, data: testimonial });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PUT /api/testimonials/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    res.json({ success: true, data: testimonial });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/testimonials/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!testimonial) return res.status(404).json({ success: false, message: 'Testimonial not found' });
    res.json({ success: true, message: 'Testimonial soft-deleted', data: testimonial });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
