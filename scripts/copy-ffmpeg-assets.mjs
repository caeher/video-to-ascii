import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public', 'ffmpeg')
const esmOutDir = join(outDir, 'esm')

const copies = [
  {
    src: join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm', 'ffmpeg-core.js'),
    dest: join(outDir, 'ffmpeg-core.js'),
  },
  {
    src: join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm', 'ffmpeg-core.wasm'),
    dest: join(outDir, 'ffmpeg-core.wasm'),
  },
  {
    src: join(root, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm', 'worker.js'),
    dest: join(esmOutDir, 'worker.js'),
  },
  {
    src: join(root, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm', 'const.js'),
    dest: join(esmOutDir, 'const.js'),
  },
  {
    src: join(root, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm', 'errors.js'),
    dest: join(esmOutDir, 'errors.js'),
  },
]

mkdirSync(esmOutDir, { recursive: true })

for (const { src, dest } of copies) {
  if (!existsSync(src)) {
    console.warn(`[copy-ffmpeg-assets] Skipping missing file: ${src}`)
    continue
  }
  copyFileSync(src, dest)
  console.log(`[copy-ffmpeg-assets] Copied ${dest}`)
}
