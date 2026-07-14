import type { AsciiConverterConfig, ExportOptions } from '../types'
import { pixelsToAscii } from './ascii-mapper'
import { renderAsciiToCanvas } from './ascii-renderer'
import { getExportDimensions } from './grid-dimensions'

const DEFAULT_FPS = 30
const SEEK_TIMEOUT_MS = 5000
const FRAME_PROGRESS_WEIGHT = 70

export interface FrameGeneratorCallbacks {
  onProgress: (progress: number, frameIndex: number, totalFrames: number) => void
  shouldAbort: () => boolean
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.001) {
      resolve()
      return
    }

    const timeout = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked)
      reject(new Error('Video seek timed out'))
    }, SEEK_TIMEOUT_MS)

    const onSeeked = () => {
      clearTimeout(timeout)
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }

    video.addEventListener('seeked', onSeeked)
    video.currentTime = Math.min(time, video.duration - 0.001)
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

export async function generateAsciiFrames(
  video: HTMLVideoElement,
  config: AsciiConverterConfig,
  options: ExportOptions,
  callbacks: FrameGeneratorCallbacks,
): Promise<Blob[]> {
  const fps = options.fps ?? DEFAULT_FPS
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

  const savedTime = video.currentTime
  const wasPlaying = !video.paused
  video.pause()

  const frames: Blob[] = []

  try {
    sampleCanvas.width = cols
    sampleCanvas.height = rows

    for (let i = 0; i < totalFrames; i++) {
      if (callbacks.shouldAbort()) {
        throw new Error('Export cancelled')
      }

      const time = i / fps
      await seekVideo(video, time)

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
      })

      const blob = await canvasToBlob(exportCanvas)
      frames.push(blob)

      const progress = ((i + 1) / totalFrames) * FRAME_PROGRESS_WEIGHT
      callbacks.onProgress(progress, i + 1, totalFrames)
    }
  } finally {
    await seekVideo(video, savedTime).catch(() => {})
    if (wasPlaying) {
      await video.play().catch(() => {})
    }
  }

  return frames
}

export function getExportEstimate(
  video: HTMLVideoElement | null,
  cols: number,
  sizeMode: ExportOptions['sizeMode'],
  fps = DEFAULT_FPS,
): { totalFrames: number; width: number; height: number } | null {
  if (!video || !video.videoWidth) return null

  const { width, height } = getExportDimensions(
    video.videoWidth,
    video.videoHeight,
    cols,
    sizeMode,
  )
  const totalFrames = Math.max(1, Math.ceil(video.duration * fps))

  return { totalFrames, width, height }
}

export { DEFAULT_FPS }
