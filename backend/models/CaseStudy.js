const mongoose = require('mongoose');

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

const CaseStudySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  id: { type: String },
  category: { type: String, default: 'Case Study' },
  client: { type: String, default: '' },
  excerpt: { type: String },
  shortDescription: { type: String },
  date: { type: String },
  publishDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  readTime: { type: String, default: '5 min read' },
  author: { type: String, default: 'LinkUp Web Team' },
  authorRole: { type: String, default: 'Editorial & Tech Team' },
  image: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  featuredImage: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  content: { type: mongoose.Schema.Types.Mixed },
  highlights: [{ type: String }],
  tags: [{ type: String }],
  status: { type: String, enum: ['Draft', 'Publish', 'Hide'], default: 'Publish' },
  featured: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  seo: SEOSchema
}, { timestamps: true });

CaseStudySchema.pre('save', function () {
  if (this.id && !this.slug) this.slug = this.id;
  if (this.slug && !this.id) this.id = this.slug;

  if (this.excerpt && !this.shortDescription) this.shortDescription = this.excerpt;
  if (this.shortDescription && !this.excerpt) this.excerpt = this.shortDescription;

  if (this.image && (!this.featuredImage || !this.featuredImage.url)) {
    this.featuredImage = { url: this.image, publicId: '' };
    this.imageUrl = this.image;
  }
  if (this.featuredImage && this.featuredImage.url && !this.image) {
    this.image = this.featuredImage.url;
    this.imageUrl = this.featuredImage.url;
  }
});

CaseStudySchema.index({ companyId: 1, slug: 1 }, { unique: true });
CaseStudySchema.index({ companyId: 1, isDeleted: 1, status: 1, publishDate: -1, createdAt: -1 });

module.exports = mongoose.models.CaseStudy || mongoose.model('CaseStudy', CaseStudySchema);
