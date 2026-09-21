/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal self-contained Node server used by the production
  // Docker image. It does not affect local `next dev`.
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
