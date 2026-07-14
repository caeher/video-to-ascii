'use client'

import { useCallback, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { AsciiConverterConfig, ExportOptions, ExportState } from '../types'
import { DEFAULT_FPS, generateAsciiFrames } from '../utils/frame-generator'
import {
  buildExportFilename,
  downloadBlob,
  encodeFramesToMp4,
  resetFFmpegCache,
} from '../utils/ffmpeg-encoder'
import { encodeFramesToWebm } from '../utils/webm-recorder'

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

function mapErrorMessage(message: string): string {
  if (message.includes('timed out')) {
    return `${message} Try a shorter clip or reload the page.`
  }
  if (message.includes('Encoder load')) {
    return `${message} MP4 may fall back to WebM automatically.`
  }
  return message
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
  const lastOptionsRef = useRef<ExportOptions | null>(null)

  const cancelExport = useCallback(() => {
    abortRef.current = true
  }, [])

  const exportVideo = useCallback(
    async (options: ExportOptions) => {
      const video = videoRef.current
      if (!video) {
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

      lastOptionsRef.current = options
      abortRef.current = false
      onExportStart()
      pause()

      try {
        await document.fonts.load('12px "Space Mono"').catch(() => {})
        await document.fonts.ready

        setExportState({ status: 'rendering', progress: 0, phase: 'frames' })

        const fps = options.fps ?? DEFAULT_FPS
        const { frames, width, height, totalFrames } = await generateAsciiFrames(
          video,
          config,
          { ...options, fps },
          {
            onProgress: (progress, frameIndex, frameTotal) => {
              setExportState({
                status: 'rendering',
                progress,
                phase: 'frames',
                frameIndex,
                totalFrames: frameTotal,
              })
            },
            shouldAbort: () => abortRef.current,
          },
        )

        if (abortRef.current) throw new Error('Export cancelled')

        setExportState({
          status: 'encoding',
          progress: 70,
          phase: 'encode',
          totalFrames,
        })

        let downloadFormat: 'mp4' | 'webm' = 'mp4'
        let infoMessage: string | undefined
        let outputBlob: Blob

        try {
          setExportState({
            status: 'loading-ffmpeg',
            progress: 70,
            phase: 'encode',
            totalFrames,
          })

          outputBlob = await encodeFramesToMp4(frames, fps, progress => {
            setExportState({
              status: 'encoding',
              progress,
              phase: 'encode',
              totalFrames,
              downloadFormat: 'mp4',
            })
          })
        } catch (mp4Error) {
          console.warn('MP4 export failed, falling back to WebM:', mp4Error)
          resetFFmpegCache()

          if (abortRef.current) throw new Error('Export cancelled')

          setExportState({
            status: 'encoding',
            progress: 70,
            phase: 'encode',
            totalFrames,
            infoMessage: 'MP4 encoder unavailable. Downloading WebM instead.',
          })

          outputBlob = await encodeFramesToWebm(frames, width, height, fps, progress => {
            setExportState({
              status: 'encoding',
              progress,
              phase: 'encode',
              totalFrames,
              downloadFormat: 'webm',
              infoMessage: 'MP4 encoder unavailable. Downloading WebM instead.',
            })
          })

          downloadFormat = 'webm'
          infoMessage = 'MP4 encoder unavailable. Downloaded WebM instead.'
        }

        if (abortRef.current) throw new Error('Export cancelled')

        const filename = buildExportFilename(
          sourceFileName || 'video',
          options.sizeMode,
          downloadFormat,
        )
        downloadBlob(outputBlob, filename)

        setExportState({
          status: 'done',
          progress: 100,
          downloadFormat,
          infoMessage,
        })
        setTimeout(() => setExportState(INITIAL_STATE), 4000)
      } catch (error) {
        console.error('Video export error:', error)
        const message =
          error instanceof Error ? error.message : 'Export failed unexpectedly.'
        if (message !== 'Export cancelled') {
          setExportState({
            status: 'error',
            progress: 0,
            errorMessage: mapErrorMessage(message),
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

  const retryExport = useCallback(() => {
    if (lastOptionsRef.current) {
      resetFFmpegCache()
      setExportState(INITIAL_STATE)
      exportVideo(lastOptionsRef.current)
    }
  }, [exportVideo])

  return { exportState, exportVideo, cancelExport, retryExport }
}
