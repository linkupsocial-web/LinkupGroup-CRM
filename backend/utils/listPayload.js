const isEmbeddedDataUrl = (value) =>
  typeof value === 'string' && value.startsWith('data:');

const remoteUrlOnly = (value) => (isEmbeddedDataUrl(value) ? '' : value || '');

const imageCard = (image = {}) => ({
  url: remoteUrlOnly(image.url),
  publicId: image.publicId || ''
});

const cardImagePath = (_value, path) => path || '';

// List responses deliberately do not include large base64 media. Give every
// consumer a complete URL to the lightweight image endpoint instead, so older
// public websites that still read `image`, `featuredImage.url`, or
// `thumbnail.url` continue to render the correct card image.
const mediaUrl = (path, origin = '') => {
  if (!path) return '';
  return origin ? `${origin.replace(/\/$/, '')}${path}` : path;
};

const mediaOrigin = (req) => {
  const configuredUrl = process.env.PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

  const forwardedProtocol = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  return `${forwardedProtocol || req.protocol}://${req.get('host')}`;
};

const articleCard = (item, basePath, origin) => {
  const path = cardImagePath(item.featuredImage?.url || item.image || item.imageUrl, `${basePath}/${item._id}/image`);
  const url = mediaUrl(path, origin);

  return {
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
    image: url || remoteUrlOnly(item.image),
    imageUrl: url || remoteUrlOnly(item.imageUrl),
    featuredImage: { ...imageCard(item.featuredImage), url: url || remoteUrlOnly(item.featuredImage?.url) },
    cardImageUrl: url,
    cardImagePath: path,
    highlights: item.highlights || [],
    tags: item.tags || [],
    status: item.status,
    featured: item.featured,
    isVisible: item.isVisible,
    displayOrder: item.displayOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

const serviceCard = (item, basePath, origin) => {
  const path = cardImagePath(item.image?.url || item.imageUrl, `${basePath}/${item._id}/image`);
  const url = mediaUrl(path, origin);

  return {
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
    image: { ...imageCard(item.image), url: url || remoteUrlOnly(item.image?.url) },
    imageUrl: url || remoteUrlOnly(item.imageUrl),
    imageAlt: item.imageAlt,
    cardImageUrl: url,
    cardImagePath: path,
    featured: item.featured,
    isVisible: item.isVisible,
    displayOrder: item.displayOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

const projectCard = (item, basePath, origin) => {
  const path = cardImagePath(item.thumbnail?.url, `${basePath}/${item._id}/image`);
  const url = mediaUrl(path, origin);

  return {
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
    thumbnail: { ...imageCard(item.thumbnail), url: url || remoteUrlOnly(item.thumbnail?.url) },
    cardImageUrl: url,
    cardImagePath: path,
    clientDetails: item.clientDetails,
    technologies: item.technologies || [],
    featured: item.featured,
    isVisible: item.isVisible,
    displayOrder: item.displayOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

const testimonialCard = (item, basePath, origin) => {
  const path = cardImagePath(item.profileImage?.url, `${basePath}/${item._id}/image`);
  const url = mediaUrl(path, origin);

  return {
    _id: item._id,
    companyId: item.companyId,
    clientName: item.clientName,
    companyName: item.companyName,
    designation: item.designation,
    profileImage: { ...imageCard(item.profileImage), url: url || remoteUrlOnly(item.profileImage?.url) },
    cardImageUrl: url,
    cardImagePath: path,
    review: item.review,
    rating: item.rating,
    isVisible: item.isVisible,
    displayOrder: item.displayOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

module.exports = {
  articleCard,
  serviceCard,
  projectCard,
  testimonialCard,
  mediaOrigin,
  isEmbeddedDataUrl
};
