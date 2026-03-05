/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bcryptjs", "exceljs"],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
