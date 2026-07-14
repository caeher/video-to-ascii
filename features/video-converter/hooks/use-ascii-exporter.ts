'use client'

import { useCallback, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { AsciiConverterConfig, ExportOptions, ExportState } from '../types'
import { DEFAULT_FPS, generateAsciiFrames } from '../utils/frame-generator'
import {
  buildExportFilename,
  downloadBlob,
  encodeFramesToMp4,
  preloadFFmpeg,
} from '../utils/ffmpeg-encoder'

interface UseAsciiExporterOptions {
  videoRef: RefObject<HTMLVideoElement | null>
  config: AsciiConverterConfig
  sourceFileName: string
  onExportStart: () => void
  onExportEnd: () => void
  pause: () => void
}

const INITIAL_STATE: ExportState = {
  status: 'idle',
  progress: 0,
}

export function useAsciiExporter({
  videoRef,
  config,
  sourceFileName,
  onExportStart,
  onExportEnd,
  pause,
}: UseAsciiExporterOptions) {
  const [exportState, setExportState] = useState<ExportState>(INITIAL_STATE)
  const abortRef = useRef(false)

  const cancelExport = useCallback(() => {
    abortRef.current = true
  }, [])

  const exportVideo = useCallback(
    async (options: ExportOptions) => {
      const video = videoRef.current
      if (!video || !video.videoWidth || !video.duration) {
        setExportState({
          status: 'error',
          progress: 0,
          errorMessage: 'No video loaded for export.',
        })
        return
      }

      if (video.duration > 120) {
        const confirmed = window.confirm(
          `This video is ${Math.round(video.duration)}s long. Export may use significant memory and take several minutes. Continue?`,
        )
        if (!confirmed) return
      }

      abortRef.current = false
      onExportStart()
      pause()

      try {
        await document.fonts.load('12px "Space Mono"')
        await document.fonts.ready

        setExportState({ status: 'loading-ffmpeg', progress: 0, phase: 'encode' })
        await preloadFFmpeg()

        if (abortRef.current) throw new Error('Export cancelled')

        setExportState({ status: 'rendering', progress: 0, phase: 'frames' })

        const fps = options.fps ?? DEFAULT_FPS
        const frames = await generateAsciiFrames(video, config, { ...options, fps }, {
          onProgress: progress => {
            setExportState({
              status: 'rendering',
              progress,
              phase: 'frames',
            })
          },
          shouldAbort: () => abortRef.current,
        })

        if (abortRef.current) throw new Error('Export cancelled')

        setExportState({ status: 'encoding', progress: 70, phase: 'encode' })

        const mp4 = await encodeFramesToMp4(frames, fps, progress => {
          setExportState({
            status: 'encoding',
            progress,
            phase: 'encode',
          })
        })

        if (abortRef.current) throw new Error('Export cancelled')

        const filename = buildExportFilename(sourceFileName || 'video', options.sizeMode)
        downloadBlob(mp4, filename)

        setExportState({ status: 'done', progress: 100 })
        setTimeout(() => setExportState(INITIAL_STATE), 3000)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Export failed unexpectedly.'
        if (message !== 'Export cancelled') {
          setExportState({
            status: 'error',
            progress: 0,
            errorMessage: message,
          })
        } else {
          setExportState(INITIAL_STATE)
        }
      } finally {
        onExportEnd()
      }
    },
    [videoRef, config, sourceFileName, onExportStart, onExportEnd, pause],
  )

  return { exportState, exportVideo, cancelExport }
}
