const mongoose = require('mongoose');
require('./Company');

const SEOSchema = new mongoose.Schema({
  metaTitle: String,
  metaDescription: String,
  metaKeywords: String,
  canonicalUrl: String,
  ogTitle: String,
  ogDescription: String,
  ogImage: String,
  twitterTitle: String,
  twitterDescription: String,
  twitterImage: String
}, { _id: false });

const ServiceSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  parentServiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
  location: { type: String, default: '' },
  isLocationService: { type: Boolean, default: false },
  serviceName: { type: String, required: true },
  title: { type: String },
  titleLines: [{ type: String }],
  slug: { type: String, required: true, lowercase: true, trim: true },
  heading: { type: String },
  text: { type: String },
  shortDescription: { type: String },
  fullDescription: { type: String },
  tags: [{ type: String }],
  deliverables: [{ type: String }],
  processSteps: [{
    stepNumber: Number,
    title: String,
    description: String
  }],
  features: [{
    title: String,
    description: String,
    icon: String
  }],
  faqs: [{
    question: String,
    answer: String
  }],
  pricing: {
    startingAt: { type: String, default: '' },
    packageDetails: { type: String, default: '' }
  },
  cta: {
    text: { type: String, default: '' },
    url: { type: String, default: '' }
  },
  image: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  imageUrl: { type: String, default: '' },
  imageAlt: { type: String, default: '' },
  serviceLink: { type: String, default: '' },
  featured: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  seo: SEOSchema
}, { timestamps: true });

ServiceSchema.pre('save', function () {
  if (Array.isArray(this.titleLines) && this.titleLines.length > 0 && !this.title) {
    this.title = this.titleLines.join(' ');
  }
  if (this.title && !this.serviceName) {
    this.serviceName = this.title;
  }
  if (this.serviceName && !this.title) {
    this.title = this.serviceName;
  }

  if (this.text && !this.shortDescription) {
    this.shortDescription = this.text;
  }
  if (this.shortDescription && !this.text) {
    this.text = this.shortDescription;
  }

  if (this.imageUrl && (!this.image || !this.image.url)) {
    this.image = { url: this.imageUrl, publicId: '' };
  }
  if (this.image && this.image.url && !this.imageUrl) {
    this.imageUrl = this.image.url;
  }
});

ServiceSchema.index({ companyId: 1, slug: 1 }, { unique: true });
ServiceSchema.index({ companyId: 1, isDeleted: 1, isVisible: 1, displayOrder: 1, createdAt: -1 });
ServiceSchema.index({ parentServiceId: 1, isDeleted: 1, displayOrder: 1, createdAt: -1 });

module.exports = mongoose.models.Service || mongoose.model('Service', ServiceSchema);
