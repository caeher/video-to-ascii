const FRAME_PROGRESS_START = 70
const FRAME_PROGRESS_RANGE = 30

function getWebmMimeType(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) ?? 'video/webm'
}

export interface WebmEncodeOptions {
  onProgress: (progress: number) => void
  shouldAbort?: () => boolean
}

export async function encodeFramesToWebm(
  frames: Blob[],
  width: number,
  height: number,
  fps: number,
  options: WebmEncodeOptions | ((progress: number) => void),
): Promise<Blob> {
  const { onProgress, shouldAbort } =
    typeof options === 'function' ? { onProgress: options, shouldAbort: undefined } : options

  if (frames.length === 0) {
    throw new Error('No frames to encode')
  }

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not supported in this browser')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not create canvas context for WebM encoding')
  }

  const stream = canvas.captureStream(0)
  const track = stream.getVideoTracks()[0]
  const mimeType = getWebmMimeType()
  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: Blob[] = []

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.onerror = () => reject(new Error('MediaRecorder failed during WebM encoding'))
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
  })

  recorder.start()

  try {
    for (let i = 0; i < frames.length; i++) {
      if (shouldAbort?.()) {
        recorder.stop()
        throw new Error('Export cancelled')
      }

      const bitmap = await createImageBitmap(frames[i])
      ctx.drawImage(bitmap, 0, 0, width, height)
      bitmap.close()

      if ('requestFrame' in track && typeof track.requestFrame === 'function') {
        track.requestFrame()
      }

      const progress =
        FRAME_PROGRESS_START + ((i + 1) / frames.length) * FRAME_PROGRESS_RANGE
      onProgress(progress)
    }

    recorder.stop()
    const blob = await recorded

    if (blob.size === 0) {
      throw new Error('WebM encoding produced an empty file')
    }

    onProgress(100)
    return blob
  } catch (error) {
    if (recorder.state !== 'inactive') {
      recorder.stop()
    }
    throw error
  }
}
