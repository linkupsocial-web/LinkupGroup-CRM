const express = require('express');
const router = express.Router();
const SEO = require('../models/SEO');
const { protect } = require('../middleware/auth');

// @route GET /api/seo?companyId=...&pageSlug=...
router.get('/', async (req, res) => {
  try {
    const { companyId, pageSlug } = req.query;
    const filter = {};
    if (companyId) filter.companyId = companyId;
    if (pageSlug) filter.pageSlug = pageSlug;

    const seoRecords = await SEO.find(filter).populate('companyId', 'name code');
    res.json({ success: true, count: seoRecords.length, data: seoRecords });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/seo (Upsert per companyId + pageSlug)
router.post('/', protect, async (req, res) => {
  try {
    const { companyId, pageSlug, ...seoData } = req.body;
    if (!companyId || !pageSlug) {
      return res.status(400).json({ success: false, message: 'companyId and pageSlug are required' });
    }

    const seo = await SEO.findOneAndUpdate(
      { companyId, pageSlug },
      { companyId, pageSlug, ...seoData },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );
    res.json({ success: true, data: seo });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
