const mongoose = require('mongoose');

const TestimonialSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  clientName: { type: String, required: true },
  companyName: { type: String },
  designation: { type: String },
  profileImage: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  review: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  isVisible: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true });

TestimonialSchema.index({ companyId: 1, isDeleted: 1, isVisible: 1, displayOrder: 1, createdAt: -1 });

module.exports = mongoose.models.Testimonial || mongoose.model('Testimonial', TestimonialSchema);
