const FFMPEG_CDN = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/+esm'

export interface FFmpegInstance {
  loaded: boolean
  on(event: 'log', callback: (data: { message: string }) => void): void
  load(
    config: { classWorkerURL?: string; coreURL?: string; wasmURL?: string },
    options?: { signal?: AbortSignal },
  ): Promise<boolean>
  writeFile(name: string, data: Uint8Array | ArrayBuffer): Promise<void>
  exec(args: string[]): Promise<number>
  readFile(name: string): Promise<Uint8Array | string>
  deleteFile(name: string): Promise<void>
}

export async function createFFmpegInstance(): Promise<FFmpegInstance> {
  if (typeof window === 'undefined') {
    throw new Error('FFmpeg can only run in the browser')
  }

  const mod = await import(
    /* webpackIgnore: true */
    FFMPEG_CDN
  )

  const FFmpeg = mod.FFmpeg as new () => FFmpegInstance
  return new FFmpeg()
}
