/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone with a self-contained server.js plus only
  // the node_modules actually reached at runtime — keeps the Docker
  // runtime stage small without a second npm install.
  output: 'standalone',
};

module.exports = nextConfig;
