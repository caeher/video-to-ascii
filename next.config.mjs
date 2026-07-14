/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
}

export default nextConfig
