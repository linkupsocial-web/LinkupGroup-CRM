const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const { protect } = require('../middleware/auth');
const { serviceCard, isEmbeddedDataUrl } = require('../utils/listPayload');

// @route GET /api/services?companyId=...
router.get('/', async (req, res) => {
  try {
    const { companyId, includeHidden, parentServiceId, includeLocationServices, summary } = req.query;
    const filter = { isDeleted: false };
    
    if (companyId && companyId !== 'all' && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = companyId;
    }
    
    if (!includeHidden) filter.isVisible = true;

    if (parentServiceId) {
      if (mongoose.Types.ObjectId.isValid(parentServiceId)) {
        filter.parentServiceId = parentServiceId;
      }
    } else if (includeLocationServices !== 'true') {
      // By default, exclude location-specific services to keep main services clean and separated
      filter.$or = [{ parentServiceId: null }, { parentServiceId: { $exists: false } }, { isLocationService: false }];
    }
    if (summary === 'true') {
      const count = await Service.countDocuments(filter);
      return res.json({ success: true, count, data: [] });
    }

    const services = await Service.find(filter)
      .select('-fullDescription -faqs -processSteps -features -pricing -cta -seo -image -imageUrl')
      .populate('companyId', 'name code slug')
      .populate('parentServiceId', 'serviceName title slug')
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    res.json({ success: true, count: services.length, data: services.map((service) => serviceCard(service, '/api/services')) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/services/:id/locations
router.get('/:id/locations', async (req, res) => {
  try {
    const { id } = req.params;
    let parentService;
    if (mongoose.Types.ObjectId.isValid(id)) {
      parentService = await Service.findById(id);
    }
    if (!parentService) {
      parentService = await Service.findOne({ slug: id, isDeleted: false });
    }
    if (!parentService) {
      return res.status(404).json({ success: false, message: 'Parent service not found' });
    }

    const locationServices = await Service.find({
      parentServiceId: parentService._id,
      isDeleted: false
    })
      .select('-fullDescription -faqs -processSteps -features -pricing -cta -seo')
      .populate('companyId', 'name code slug')
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    res.json({ success: true, count: locationServices.length, data: locationServices.map((service) => serviceCard(service, '/api/services')) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/image', async (req, res) => {
  try {
    const item = await Service.findById(req.params.id).select('image imageUrl isDeleted').lean();
    const image = item?.image?.url || item?.imageUrl;
    if (!item || item.isDeleted || !image) return res.status(404).end();
    if (!isEmbeddedDataUrl(image)) return res.redirect(image);
    const [metadata, encoded] = image.split(',', 2);
    res.set('Cache-Control', 'public, max-age=86400');
    res.type(metadata.match(/^data:([^;]+)/)?.[1] || 'image/jpeg').send(Buffer.from(encoded, 'base64'));
  } catch (err) { res.status(400).end(); }
});

// @route GET /api/services/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let service;
    if (mongoose.Types.ObjectId.isValid(id)) {
      service = await Service.findById(id)
        .populate('companyId', 'name code slug')
        .populate('parentServiceId', 'serviceName title slug location');
    }
    if (!service) {
      service = await Service.findOne({ slug: id, isDeleted: false })
        .populate('companyId', 'name code slug')
        .populate('parentServiceId', 'serviceName title slug location');
    }
    if (!service || service.isDeleted) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, data: service });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/services
router.post('/', protect, async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json({ success: true, data: service });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PUT /api/services/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PATCH /api/services/:id/visibility
router.patch('/:id/visibility', protect, async (req, res) => {
  try {
    const { isVisible } = req.body;
    const service = await Service.findByIdAndUpdate(req.params.id, { isVisible }, { new: true });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/services/:id (Soft Delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, message: 'Service soft-deleted', data: service });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
