const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const { protect } = require('../middleware/auth');
const { serviceCard, mediaOrigin, isEmbeddedDataUrl } = require('../utils/listPayload');
const { resolveCompanyId } = require('../utils/companyHelper');

// @route GET /api/services?companyId=...
router.get('/', async (req, res) => {
  try {
    const { includeHidden, parentServiceId, includeLocationServices, summary } = req.query;
    const filter = { isDeleted: false };
    
    const companyId = await resolveCompanyId(req);
    if (companyId === 'NOT_FOUND') {
      return res.json({ success: true, count: 0, data: [] });
    }
    if (companyId) {
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

    res.json({ success: true, count: services.length, data: services.map((service) => serviceCard(service, '/api/services', mediaOrigin(req))) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/services/:id/locations
router.get('/:id/locations', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = await resolveCompanyId(req);

    let parentService;
    if (mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id)) {
      const parentQuery = { _id: id, isDeleted: false };
      if (companyId && companyId !== 'NOT_FOUND') {
        parentQuery.companyId = companyId;
      }
      parentService = await Service.findOne(parentQuery);
    }
    if (!parentService) {
      const parentQuery = { slug: id, isDeleted: false };
      if (companyId && companyId !== 'NOT_FOUND') {
        parentQuery.companyId = companyId;
      }
      parentService = await Service.findOne(parentQuery);
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

    res.json({ success: true, count: locationServices.length, data: locationServices.map((service) => serviceCard(service, '/api/services', mediaOrigin(req))) });
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
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
    res.type(metadata.match(/^data:([^;]+)/)?.[1] || 'image/jpeg').send(Buffer.from(encoded, 'base64'));
  } catch (err) { res.status(400).end(); }
});

// @route GET /api/services/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = await resolveCompanyId(req);

    let service;
    if (mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id)) {
      const query = { _id: id, isDeleted: false };
      if (companyId && companyId !== 'NOT_FOUND') {
        query.companyId = companyId;
      }
      service = await Service.findOne(query)
        .populate('companyId', 'name code slug')
        .populate('parentServiceId', 'serviceName title slug location');
    }
    if (!service) {
      const query = { slug: id, isDeleted: false };
      if (companyId && companyId !== 'NOT_FOUND') {
        query.companyId = companyId;
      }
      service = await Service.findOne(query)
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
    const data = { ...req.body };
    if (data.companyId) {
      const resolved = await resolveCompanyId(data.companyId);
      if (resolved && resolved !== 'NOT_FOUND') {
        data.companyId = resolved;
      }
    }
    const service = await Service.create(data);
    res.status(201).json({ success: true, data: service });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route PUT /api/services/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
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
    const service = await Service.findByIdAndUpdate(req.params.id, { isVisible }, { returnDocument: 'after' });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/services/:id (Soft Delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { isDeleted: true }, { returnDocument: 'after' });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, message: 'Service soft-deleted', data: service });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
