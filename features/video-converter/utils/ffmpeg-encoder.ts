import type { FFmpeg } from '@ffmpeg/ffmpeg'

const FFMPEG_VERSION = '0.12.10'

let ffmpegInstance: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

async function loadFFmpeg(onLoadProgress?: (message: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const { toBlobURL } = await import('@ffmpeg/util')

    const ffmpeg = new FFmpeg()

    ffmpeg.on('log', ({ message }) => {
      onLoadProgress?.(message)
    })

    const baseURL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/esm`
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    ffmpegInstance = ffmpeg
    return ffmpeg
  })()

  return loadPromise
}

export async function encodeFramesToMp4(
  frames: Blob[],
  fps: number,
  onProgress: (progress: number) => void,
): Promise<Blob> {
  const { fetchFile } = await import('@ffmpeg/util')
  const ffmpeg = await loadFFmpeg()

  const frameProgressStart = 70
  const frameProgressRange = 30

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

  for (let i = 0; i < frames.length; i++) {
    const name = `frame_${String(i + 1).padStart(4, '0')}.png`
    await ffmpeg.deleteFile(name).catch(() => {})
  }
  await ffmpeg.deleteFile('output.mp4').catch(() => {})

  onProgress(100)
  return mp4Blob
}

export async function preloadFFmpeg(): Promise<void> {
  await loadFFmpeg()
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function buildExportFilename(sourceName: string, sizeMode: string): string {
  const base = sourceName.replace(/\.[^.]+$/, '') || 'video'
  const sanitized = base.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `ascii-flux-${sanitized}-${sizeMode}.mp4`
}
