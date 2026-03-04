/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bcryptjs"],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
