const isEmbeddedDataUrl = (value) =>
  typeof value === 'string' && value.startsWith('data:');

const remoteUrlOnly = (value) => (isEmbeddedDataUrl(value) ? '' : value || '');

const imageCard = (image = {}) => ({
  url: remoteUrlOnly(image.url),
  publicId: image.publicId || ''
});

const cardImagePath = (value, path) =>
  isEmbeddedDataUrl(value) ? path : '';

const articleCard = (item, basePath) => ({
  _id: item._id,
  companyId: item.companyId,
  id: item.id,
  title: item.title,
  slug: item.slug,
  category: item.category,
  client: item.client,
  excerpt: item.excerpt,
  shortDescription: item.shortDescription,
  date: item.date,
  publishDate: item.publishDate,
  readTime: item.readTime,
  author: item.author,
  authorRole: item.authorRole,
  image: remoteUrlOnly(item.image),
  imageUrl: remoteUrlOnly(item.imageUrl),
  featuredImage: imageCard(item.featuredImage),
  cardImagePath: cardImagePath(item.featuredImage?.url || item.image || item.imageUrl, `${basePath}/${item._id}/image`),
  highlights: item.highlights || [],
  tags: item.tags || [],
  status: item.status,
  featured: item.featured,
  isVisible: item.isVisible,
  displayOrder: item.displayOrder,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

const serviceCard = (item, basePath) => ({
  _id: item._id,
  companyId: item.companyId,
  parentServiceId: item.parentServiceId,
  location: item.location,
  isLocationService: item.isLocationService,
  serviceName: item.serviceName,
  title: item.title,
  titleLines: item.titleLines || [],
  slug: item.slug,
  heading: item.heading,
  text: item.text,
  shortDescription: item.shortDescription,
  tags: item.tags || [],
  deliverables: item.deliverables || [],
  image: imageCard(item.image),
  imageUrl: remoteUrlOnly(item.imageUrl),
  imageAlt: item.imageAlt,
  cardImagePath: cardImagePath(item.image?.url || item.imageUrl, `${basePath}/${item._id}/image`),
  featured: item.featured,
  isVisible: item.isVisible,
  displayOrder: item.displayOrder,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

const projectCard = (item, basePath) => ({
  _id: item._id,
  companyId: item.companyId,
  slug: item.slug,
  projectTitle: item.projectTitle,
  title: item.title,
  category: item.category,
  tags: item.tags || [],
  description: item.description,
  shortDescription: item.shortDescription,
  liveUrl: item.liveUrl,
  projectUrl: item.projectUrl,
  video: remoteUrlOnly(item.video),
  deliverables: item.deliverables || [],
  thumbnail: imageCard(item.thumbnail),
  cardImagePath: cardImagePath(item.thumbnail?.url, `${basePath}/${item._id}/image`),
  clientDetails: item.clientDetails,
  technologies: item.technologies || [],
  featured: item.featured,
  isVisible: item.isVisible,
  displayOrder: item.displayOrder,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

const testimonialCard = (item, basePath) => ({
  _id: item._id,
  companyId: item.companyId,
  clientName: item.clientName,
  companyName: item.companyName,
  designation: item.designation,
  profileImage: imageCard(item.profileImage),
  cardImagePath: cardImagePath(item.profileImage?.url, `${basePath}/${item._id}/image`),
  review: item.review,
  rating: item.rating,
  isVisible: item.isVisible,
  displayOrder: item.displayOrder,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

module.exports = {
  articleCard,
  serviceCard,
  projectCard,
  testimonialCard,
  isEmbeddedDataUrl
};
