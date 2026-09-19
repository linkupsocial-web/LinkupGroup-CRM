const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const { protect } = require('../middleware/auth');
const { articleCard, mediaOrigin, isEmbeddedDataUrl } = require('../utils/listPayload');

// @route GET /api/blogs
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
      const count = await Blog.countDocuments(filter);
      return res.json({ success: true, count, data: [] });
    }

    const blogs = await Blog.find(filter)
      .select('-content -seo -image -imageUrl -featuredImage')
      .populate('companyId', 'name code slug')
      .sort({ publishDate: -1, createdAt: -1 })
      .lean();
    res.json({ success: true, count: blogs.length, data: blogs.map((blog) => articleCard(blog, '/api/blogs', mediaOrigin(req))) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/blogs/:id/image (lazy card image for legacy data URLs)
router.get('/:id/image', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).select('image imageUrl featuredImage isDeleted').lean();
    const image = blog?.featuredImage?.url || blog?.image || blog?.imageUrl;
    if (!blog || blog.isDeleted || !image) return res.status(404).end();
    if (!isEmbeddedDataUrl(image)) return res.redirect(image);
    const [metadata, encoded] = image.split(',', 2);
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
    res.type(metadata.match(/^data:([^;]+)/)?.[1] || 'image/jpeg').send(Buffer.from(encoded, 'base64'));
  } catch (err) { res.status(400).end(); }
});

// @route GET /api/blogs/:id
router.get('/:id', async (req, res) => {
  try {
    let blog = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      blog = await Blog.findById(req.params.id).populate('companyId', 'name code slug');
    }
    if (!blog) {
      blog = await Blog.findOne({
        $or: [{ slug: req.params.id }, { id: req.params.id }],
        isDeleted: false
      }).populate('companyId', 'name code slug');
    }
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/blogs
router.post('/', protect, async (req, res) => {
  try {
    const blog = await Blog.create(req.body);
    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PUT /api/blogs/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog post not found' });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PATCH /api/blogs/:id/status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Draft', 'Publish', 'Hide'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const blog = await Blog.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog post not found' });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/blogs/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, { isDeleted: true }, { returnDocument: 'after' });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog post not found' });
    res.json({ success: true, message: 'Blog soft-deleted', data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
