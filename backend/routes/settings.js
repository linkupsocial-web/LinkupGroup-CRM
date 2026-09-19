const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { protect, superAdminOnly } = require('../middleware/auth');

// @route GET /api/settings
router.get('/', async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({ siteTitle: 'Linkup Group Admin Panel' });
    }
    res.json({ success: true, data: setting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/settings
router.put('/', protect, superAdminOnly, async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create(req.body);
    } else {
      setting = await Setting.findByIdAndUpdate(setting._id, req.body, { returnDocument: 'after' });
    }
    res.json({ success: true, data: setting });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
