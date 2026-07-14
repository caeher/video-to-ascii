import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ffmpegBrowserEntry = './node_modules/@ffmpeg/ffmpeg/dist/esm/index.js'
const ffmpegUtilBrowserEntry = './node_modules/@ffmpeg/util/dist/esm/index.js'
const ffmpegBrowserEntryAbsolute = path.join(
  __dirname,
  'node_modules/@ffmpeg/ffmpeg/dist/esm/index.js',
)
const ffmpegUtilBrowserEntryAbsolute = path.join(
  __dirname,
  'node_modules/@ffmpeg/util/dist/esm/index.js',
)

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      '@ffmpeg/ffmpeg': ffmpegBrowserEntry,
      '@ffmpeg/util': ffmpegUtilBrowserEntry,
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@ffmpeg/ffmpeg': ffmpegBrowserEntryAbsolute,
      '@ffmpeg/util': ffmpegUtilBrowserEntryAbsolute,
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/ffmpeg/:path*',
        headers: [{ key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' }],
      },
    ]
  },
}

export default nextConfig
