import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { createFFmpegInstance, type FFmpegInstance } from './ffmpeg-loader'

const INIT_TIMEOUT_MS = 30_000
const BLOB_PREP_TIMEOUT_MS = 90_000
const COLD_LOAD_TIMEOUT_MS = 120_000

let ffmpegInstance: FFmpegInstance | null = null
let loadPromise: Promise<FFmpegInstance> | null = null

export interface FfmpegLoadOptions {
  onLoadProgress?: (message: string) => void
  signal?: AbortSignal
}

export interface EncodeMp4LoadOptions extends FfmpegLoadOptions {}

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

function getOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

function attachLoadLogger(ffmpeg: FFmpegInstance, onLoadProgress?: (message: string) => void): void {
  if (!onLoadProgress) return
  ffmpeg.on('log', ({ message }) => {
    onLoadProgress(message)
  })
}

async function loadWithDirectUrls(
  ffmpeg: FFmpegInstance,
  options: FfmpegLoadOptions,
): Promise<void> {
  const origin = getOrigin()
  const base = `${origin}/ffmpeg`

  await withTimeout(
    ffmpeg.load(
      {
        classWorkerURL: `${origin}/ffmpeg/esm/worker.js`,
        coreURL: `${base}/ffmpeg-core.js`,
        wasmURL: `${base}/ffmpeg-core.wasm`,
      },
      { signal: options.signal },
    ),
    COLD_LOAD_TIMEOUT_MS,
    'Encoder load timed out. Try reloading the page.',
  )
}

async function loadWithBlobUrls(
  ffmpeg: FFmpegInstance,
  options: FfmpegLoadOptions,
): Promise<void> {
  const baseURL = getFfmpegBaseUrl()
  const origin = getOrigin()

  const [coreURL, wasmURL] = await withTimeout(
    Promise.all([
      toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    ]),
    BLOB_PREP_TIMEOUT_MS,
    'Encoder download timed out. Try reloading the page.',
  )

  await withTimeout(
    ffmpeg.load(
      {
        classWorkerURL: `${origin}/ffmpeg/esm/worker.js`,
        coreURL,
        wasmURL,
      },
      { signal: options.signal },
    ),
    INIT_TIMEOUT_MS,
    'Encoder initialization timed out. Try reloading the page.',
  )
}

async function loadFFmpeg(options: FfmpegLoadOptions = {}): Promise<FFmpegInstance> {
  if (ffmpegInstance?.loaded) return ffmpegInstance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const ffmpeg = await createFFmpegInstance()
    attachLoadLogger(ffmpeg, options.onLoadProgress)

    try {
      await loadWithDirectUrls(ffmpeg, options)
    } catch (directError) {
      if (options.signal?.aborted) throw directError
      ffmpeg.terminate()
      const retryFfmpeg = await createFFmpegInstance()
      attachLoadLogger(retryFfmpeg, options.onLoadProgress)
      await loadWithBlobUrls(retryFfmpeg, options)
      ffmpegInstance = retryFfmpeg
      return retryFfmpeg
    }

    ffmpegInstance = ffmpeg
    return ffmpeg
  })()

  try {
    return await loadPromise
  } catch (error) {
    loadPromise = null
    if (ffmpegInstance) {
      ffmpegInstance.terminate()
      ffmpegInstance = null
    }
    throw error
  }
}

export function resetFFmpegCache(): void {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate()
    } catch {
      // ignore termination errors on stale instances
    }
  }
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
  loadOptions?: EncodeMp4LoadOptions,
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error('No frames to encode')
  }

  const ffmpeg = await loadFFmpeg(loadOptions)
  const frameProgressStart = 70
  const frameProgressRange = 30

  try {
    for (let i = 0; i < frames.length; i++) {
      if (loadOptions?.signal?.aborted) {
        throw new DOMException('Export cancelled', 'AbortError')
      }

      const name = `frame_${String(i + 1).padStart(4, '0')}.png`
      await ffmpeg.writeFile(name, await fetchFile(frames[i]), { signal: loadOptions?.signal })

      const writeProgress =
        frameProgressStart + ((i + 1) / frames.length) * frameProgressRange * 0.5
      onProgress(writeProgress)
    }

    await ffmpeg.exec(
      [
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
      ],
      -1,
      { signal: loadOptions?.signal },
    )

    onProgress(95)

    const data = await ffmpeg.readFile('output.mp4', 'binary', { signal: loadOptions?.signal })
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

export async function preloadFFmpeg(options: FfmpegLoadOptions = {}): Promise<void> {
  await loadFFmpeg(options)
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
