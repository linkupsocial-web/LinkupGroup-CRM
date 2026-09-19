const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CaseStudy = require('../models/CaseStudy');
const { protect } = require('../middleware/auth');
const { articleCard, mediaOrigin, isEmbeddedDataUrl } = require('../utils/listPayload');

// @route GET /api/case-studies
router.get('/', async (req, res) => {
  try {
    const { companyId, status, includeAll, summary } = req.query;
    const filter = { isDeleted: false };
    
    if (companyId && companyId !== 'all' && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = companyId;
    }
    
    if (status) {
      filter.status = status;
    } else if (!includeAll) {
      filter.status = 'Publish';
    }
    if (summary === 'true') {
      const count = await CaseStudy.countDocuments(filter);
      return res.json({ success: true, count, data: [] });
    }

    const caseStudies = await CaseStudy.find(filter)
      .select('-content -seo -image -imageUrl -featuredImage')
      .populate('companyId', 'name code slug')
      .sort({ publishDate: -1, createdAt: -1 })
      .lean();
    res.json({ success: true, count: caseStudies.length, data: caseStudies.map((item) => articleCard(item, '/api/case-studies', mediaOrigin(req))) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/image', async (req, res) => {
  try {
    const item = await CaseStudy.findById(req.params.id).select('image imageUrl featuredImage isDeleted').lean();
    const image = item?.featuredImage?.url || item?.image || item?.imageUrl;
    if (!item || item.isDeleted || !image) return res.status(404).end();
    if (!isEmbeddedDataUrl(image)) return res.redirect(image);
    const [metadata, encoded] = image.split(',', 2);
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
    res.type(metadata.match(/^data:([^;]+)/)?.[1] || 'image/jpeg').send(Buffer.from(encoded, 'base64'));
  } catch (err) { res.status(400).end(); }
});

// @route GET /api/case-studies/:id
router.get('/:id', async (req, res) => {
  try {
    let caseStudy = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      caseStudy = await CaseStudy.findById(req.params.id).populate('companyId', 'name code slug');
    }
    if (!caseStudy) {
      caseStudy = await CaseStudy.findOne({
        $or: [{ slug: req.params.id }, { id: req.params.id }],
        isDeleted: false
      }).populate('companyId', 'name code slug');
    }
    if (!caseStudy) {
      return res.status(404).json({ success: false, message: 'Case Study not found' });
    }
    res.json({ success: true, data: caseStudy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/case-studies
router.post('/', protect, async (req, res) => {
  try {
    const caseStudy = await CaseStudy.create(req.body);
    res.status(201).json({ success: true, data: caseStudy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PUT /api/case-studies/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
    if (!caseStudy) return res.status(404).json({ success: false, message: 'Case Study not found' });
    res.json({ success: true, data: caseStudy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PATCH /api/case-studies/:id/status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Draft', 'Publish', 'Hide'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const caseStudy = await CaseStudy.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
    if (!caseStudy) return res.status(404).json({ success: false, message: 'Case Study not found' });
    res.json({ success: true, data: caseStudy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/case-studies/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findByIdAndUpdate(req.params.id, { isDeleted: true }, { returnDocument: 'after' });
    if (!caseStudy) return res.status(404).json({ success: false, message: 'Case Study not found' });
    res.json({ success: true, message: 'Case Study soft-deleted', data: caseStudy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
