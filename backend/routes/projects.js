const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');
const { projectCard, isEmbeddedDataUrl } = require('../utils/listPayload');

// @route GET /api/projects
router.get('/', async (req, res) => {
  try {
    const { companyId, includeHidden, summary } = req.query;
    const filter = { isDeleted: false };
    
    if (companyId && companyId !== 'all' && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = companyId;
    }
    
    if (!includeHidden) filter.isVisible = true;
    if (summary === 'true') {
      const count = await Project.countDocuments(filter);
      return res.json({ success: true, count, data: [] });
    }

    const projects = await Project.find(filter)
      .select('-longDescription -fullDescription -gallery -seo -video -thumbnail')
      .populate('companyId', 'name code slug')
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    res.json({ success: true, count: projects.length, data: projects.map((project) => projectCard(project, '/api/projects')) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/image', async (req, res) => {
  try {
    const item = await Project.findById(req.params.id).select('thumbnail isDeleted').lean();
    const image = item?.thumbnail?.url;
    if (!item || item.isDeleted || !image) return res.status(404).end();
    if (!isEmbeddedDataUrl(image)) return res.redirect(image);
    const [metadata, encoded] = image.split(',', 2);
    res.set('Cache-Control', 'public, max-age=86400');
    res.type(metadata.match(/^data:([^;]+)/)?.[1] || 'image/jpeg').send(Buffer.from(encoded, 'base64'));
  } catch (err) { res.status(400).end(); }
});

// @route GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    const project = await Project.findOne({ _id: req.params.id, isDeleted: false })
      .populate('companyId', 'name code slug');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/projects
router.post('/', protect, async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PUT /api/projects/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PATCH /api/projects/:id/visibility
router.patch('/:id/visibility', protect, async (req, res) => {
  try {
    const { isVisible } = req.body;
    const project = await Project.findByIdAndUpdate(req.params.id, { isVisible }, { new: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/projects/:id (Soft delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project soft-deleted', data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
