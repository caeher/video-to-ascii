import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { createFFmpegInstance, type FFmpegInstance } from './ffmpeg-loader'

const LOAD_TIMEOUT_MS = 60_000

let ffmpegInstance: FFmpegInstance | null = null
let loadPromise: Promise<FFmpegInstance> | null = null

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise
      .then(value => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch(error => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

function getFfmpegBaseUrl(): string {
  return typeof window !== 'undefined' ? `${window.location.origin}/ffmpeg` : '/ffmpeg'
}

async function loadFFmpeg(onLoadProgress?: (message: string) => void): Promise<FFmpegInstance> {
  if (ffmpegInstance?.loaded) return ffmpegInstance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const ffmpeg = await createFFmpegInstance()

    ffmpeg.on('log', ({ message }) => {
      onLoadProgress?.(message)
    })

    const baseURL = getFfmpegBaseUrl()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''

    await withTimeout(
      ffmpeg.load({
        classWorkerURL: `${origin}/ffmpeg/worker.js`,
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      }),
      LOAD_TIMEOUT_MS,
      'Encoder load timed out. Try reloading the page.',
    )

    ffmpegInstance = ffmpeg
    return ffmpeg
  })()

  try {
    return await loadPromise
  } catch (error) {
    loadPromise = null
    ffmpegInstance = null
    throw error
  }
}

export function resetFFmpegCache(): void {
  ffmpegInstance = null
  loadPromise = null
}

async function cleanupFrameFiles(ffmpeg: FFmpegInstance, frameCount: number): Promise<void> {
  for (let i = 0; i < frameCount; i++) {
    const name = `frame_${String(i + 1).padStart(4, '0')}.png`
    await ffmpeg.deleteFile(name).catch(() => {})
  }
  await ffmpeg.deleteFile('output.mp4').catch(() => {})
}

export async function encodeFramesToMp4(
  frames: Blob[],
  fps: number,
  onProgress: (progress: number) => void,
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error('No frames to encode')
  }

  const ffmpeg = await loadFFmpeg()
  const frameProgressStart = 70
  const frameProgressRange = 30

  try {
    for (let i = 0; i < frames.length; i++) {
      const name = `frame_${String(i + 1).padStart(4, '0')}.png`
      await ffmpeg.writeFile(name, await fetchFile(frames[i]))

      const writeProgress =
        frameProgressStart + ((i + 1) / frames.length) * frameProgressRange * 0.5
      onProgress(writeProgress)
    }

    await ffmpeg.exec([
      '-framerate',
      String(fps),
      '-i',
      'frame_%04d.png',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-y',
      'output.mp4',
    ])

    onProgress(95)

    const data = await ffmpeg.readFile('output.mp4')
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer)
    const mp4Blob = new Blob([bytes], { type: 'video/mp4' })

    if (mp4Blob.size === 0) {
      throw new Error('MP4 encoding produced an empty file')
    }

    onProgress(100)
    return mp4Blob
  } finally {
    await cleanupFrameFiles(ffmpeg, frames.length)
  }
}

export async function preloadFFmpeg(): Promise<void> {
  await loadFFmpeg()
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (blob.size === 0) {
    throw new Error('Cannot download an empty file')
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function buildExportFilename(
  sourceName: string,
  sizeMode: string,
  extension: 'mp4' | 'webm' = 'mp4',
): string {
  const base = sourceName.replace(/\.[^.]+$/, '') || 'video'
  const sanitized = base.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `ascii-flux-${sanitized}-${sizeMode}.${extension}`
}
