import type { FFmpeg } from '@ffmpeg/ffmpeg'

export type FFmpegInstance = FFmpeg

export async function createFFmpegInstance(): Promise<FFmpegInstance> {
  if (typeof window === 'undefined') {
    throw new Error('FFmpeg can only run in the browser')
  }

  const { FFmpeg: FFmpegClass } = await import('@ffmpeg/ffmpeg')
  return new FFmpegClass()
}
