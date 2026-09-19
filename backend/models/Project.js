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

const ProjectSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  slug: { type: String, default: '' },
  projectTitle: { type: String, required: true },
  title: { type: String },
  category: { type: String, default: 'General' },
  tags: [{ type: String }],
  description: { type: String, default: '' },
  shortDescription: { type: String, default: '' },
  longDescription: { type: String, default: '' },
  fullDescription: { type: String, default: '' },
  liveUrl: { type: String, default: '' },
  projectUrl: { type: String, default: '' },
  video: { type: String, default: '' },
  deliverables: [{ type: String }],
  thumbnail: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  gallery: [{
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  }],
  clientDetails: { type: String, default: '' },
  technologies: [{ type: String }],
  featured: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  seo: SEOSchema
}, { timestamps: true });

ProjectSchema.pre('save', function () {
  if (this.title && !this.projectTitle) this.projectTitle = this.title;
  if (this.projectTitle && !this.title) this.title = this.projectTitle;

  if (this.liveUrl && !this.projectUrl) this.projectUrl = this.liveUrl;
  if (this.projectUrl && !this.liveUrl) this.liveUrl = this.projectUrl;

  if (this.description && !this.shortDescription) this.shortDescription = this.description;
  if (this.shortDescription && !this.description) this.description = this.shortDescription;

  if (this.longDescription && !this.fullDescription) this.fullDescription = this.longDescription;
  if (this.fullDescription && !this.longDescription) this.longDescription = this.fullDescription;
});

ProjectSchema.index({ companyId: 1, isDeleted: 1, isVisible: 1, displayOrder: 1, createdAt: -1 });

module.exports = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
