import type { AsciiConverterConfig, ExportOptions } from '../types'
import { pixelsToAscii } from './ascii-mapper'
import { renderAsciiToCanvas, resolveFontFamily } from './ascii-renderer'
import { getExportDimensions } from './grid-dimensions'

const DEFAULT_FPS = 30
const SEEK_TIMEOUT_MS = 10_000
const FRAME_PROGRESS_WEIGHT = 70
const MAX_EXPORT_FRAMES = 3600

export interface FrameGeneratorCallbacks {
  onProgress: (progress: number, frameIndex: number, totalFrames: number) => void
  shouldAbort: () => boolean
}

export interface FrameGeneratorResult {
  frames: Blob[]
  width: number
  height: number
  fps: number
  totalFrames: number
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) {
      resolve()
      return
    }

    const timeout = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked)
      reject(new Error('Video seek timed out. Try a shorter video or re-export.'))
    }, SEEK_TIMEOUT_MS)

    const onSeeked = () => {
      clearTimeout(timeout)
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }

    video.addEventListener('seeked', onSeeked)
    video.currentTime = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.001))
  })
}

async function waitForVideoFrame(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2) return

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      video.removeEventListener('loadeddata', onReady)
      reject(new Error('Video frame not ready'))
    }, SEEK_TIMEOUT_MS)

    const onReady = () => {
      clearTimeout(timeout)
      video.removeEventListener('loadeddata', onReady)
      resolve()
    }

    video.addEventListener('loadeddata', onReady)
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Failed to create frame blob'))),
      'image/png',
    )
  })
}

export function validateExportVideo(video: HTMLVideoElement, fps = DEFAULT_FPS): void {
  if (!video.videoWidth) {
    throw new Error('Video not ready for export.')
  }

  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    throw new Error('Cannot export: invalid video duration.')
  }

  const totalFrames = Math.max(1, Math.ceil(video.duration * fps))
  if (totalFrames > MAX_EXPORT_FRAMES) {
    throw new Error(
      `Export limit exceeded (${totalFrames} frames). Maximum is ${MAX_EXPORT_FRAMES} frames (~2 min at 30fps).`,
    )
  }
}

export async function generateAsciiFrames(
  video: HTMLVideoElement,
  config: AsciiConverterConfig,
  options: ExportOptions,
  callbacks: FrameGeneratorCallbacks,
): Promise<FrameGeneratorResult> {
  const fps = options.fps ?? DEFAULT_FPS
  validateExportVideo(video, fps)

  const totalFrames = Math.max(1, Math.ceil(video.duration * fps))
  const { width, height, cols, rows } = getExportDimensions(
    video.videoWidth,
    video.videoHeight,
    config.cols,
    options.sizeMode,
  )

  const sampleCanvas = document.createElement('canvas')
  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = width
  exportCanvas.height = height

  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true })
  const exportCtx = exportCanvas.getContext('2d')
  if (!sampleCtx || !exportCtx) {
    throw new Error('Could not create canvas context')
  }

  const fontFamily = resolveFontFamily()
  const savedTime = video.currentTime
  const wasPlaying = !video.paused
  video.pause()

  const frames: Blob[] = []

  try {
    sampleCanvas.width = cols
    sampleCanvas.height = rows

    for (let i = 0; i < totalFrames; i++) {
      if (callbacks.shouldAbort()) {
        frames.length = 0
        throw new Error('Export cancelled')
      }

      const time = i / fps
      await seekVideo(video, time)
      await waitForVideoFrame(video)

      if (video.readyState < 2) {
        throw new Error('Video frame not available for export')
      }

      sampleCtx.drawImage(video, 0, 0, cols, rows)
      const imageData = sampleCtx.getImageData(0, 0, cols, rows)
      const lines = pixelsToAscii(
        imageData.data,
        cols,
        rows,
        config.contrast,
        config.brightness,
        config.invert,
      )

      renderAsciiToCanvas(exportCtx, lines, {
        width,
        height,
        cols,
        rows,
        colorMode: config.colorMode,
        fontFamily,
      })

      const blob = await canvasToBlob(exportCanvas)
      frames.push(blob)

      const progress = ((i + 1) / totalFrames) * FRAME_PROGRESS_WEIGHT
      callbacks.onProgress(progress, i + 1, totalFrames)
    }
  } catch (error) {
    frames.length = 0
    throw error
  } finally {
    await seekVideo(video, savedTime).catch(() => {})
    if (wasPlaying) {
      await video.play().catch(() => {})
    }
  }

  return { frames, width, height, fps, totalFrames }
}

export function getExportEstimate(
  video: HTMLVideoElement | null,
  cols: number,
  sizeMode: ExportOptions['sizeMode'],
  fps = DEFAULT_FPS,
): { totalFrames: number; width: number; height: number } | null {
  if (!video || !video.videoWidth || !Number.isFinite(video.duration)) return null

  const { width, height } = getExportDimensions(
    video.videoWidth,
    video.videoHeight,
    cols,
    sizeMode,
  )
  const totalFrames = Math.max(1, Math.ceil(video.duration * fps))

  return { totalFrames, width, height }
}

export { DEFAULT_FPS, MAX_EXPORT_FRAMES }
