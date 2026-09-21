const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const FAQ = require('../models/FAQ');
const { protect } = require('../middleware/auth');
const { resolveCompanyId } = require('../utils/companyHelper');

// @route GET /api/faqs
router.get('/', async (req, res) => {
  try {
    const { includeHidden, pageSlug, includePageFaqs, summary } = req.query;
    const filter = { isDeleted: false };
    
    const companyId = await resolveCompanyId(req);
    if (companyId === 'NOT_FOUND') {
      return res.json({ success: true, count: 0, data: [] });
    }
    if (companyId) {
      filter.companyId = companyId;
    }

    if (pageSlug) {
      // Page level F&Q — used by the F&Q section at the bottom of every page.
      filter.pageSlug = pageSlug;
    } else if (includePageFaqs !== 'true') {
      // Unfiltered requests keep returning only the site-wide FAQs so the
      // page level F&Q can never leak into the public website FAQ list.
      filter.$or = [
        { pageSlug: 'all' },
        { pageSlug: { $exists: false } },
        { pageSlug: null },
        { pageSlug: '' }
      ];
    }
    
    if (!includeHidden) filter.isVisible = true;
    if (summary === 'true') {
      const count = await FAQ.countDocuments(filter);
      return res.json({ success: true, count, data: [] });
    }

    const faqs = await FAQ.find(filter)
      .populate('companyId', 'name code slug')
      .sort({ displayOrder: 1, createdAt: -1 });
    res.json({ success: true, count: faqs.length, data: faqs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/faqs
router.post('/', protect, async (req, res) => {
  try {
    const faq = await FAQ.create(req.body);
    res.status(201).json({ success: true, data: faq });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PUT /api/faqs/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
    if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
    res.json({ success: true, data: faq });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/faqs/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, { isDeleted: true }, { returnDocument: 'after' });
    if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
    res.json({ success: true, message: 'FAQ soft-deleted', data: faq });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
