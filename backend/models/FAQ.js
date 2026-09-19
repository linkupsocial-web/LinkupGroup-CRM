const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  // Which page the F&Q belongs to. 'all' = the site-wide FAQ list that the
  // public websites and the FAQ manager page consume.
  pageSlug: { type: String, default: 'all', trim: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, default: 'General' },
  displayOrder: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

FAQSchema.index({ companyId: 1, pageSlug: 1, displayOrder: 1 });
FAQSchema.index({ companyId: 1, pageSlug: 1, isDeleted: 1, isVisible: 1, displayOrder: 1 });

module.exports = mongoose.models.FAQ || mongoose.model('FAQ', FAQSchema);
