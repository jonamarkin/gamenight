/** @type {import('next').NextConfig} */
const nextConfig = {
  // The word list is a large JSON file; load it at runtime instead of bundling it.
  serverExternalPackages: ['an-array-of-english-words'],
};

export default nextConfig;
