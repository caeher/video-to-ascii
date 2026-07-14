'use client'

import { useCallback, useState } from 'react'
import { useAsciiConverter } from '../hooks/use-ascii-converter'
import { useAsciiExporter } from '../hooks/use-ascii-exporter'
import { useFfmpegPreload } from '../hooks/use-ffmpeg-preload'
import type { ExportSizeMode } from '../types'
import { AsciiViewer } from './ascii-viewer'
import { ConverterControls } from './converter-controls'
import { ExportControls } from './export-controls'
import { VideoDropzone } from './video-dropzone'

export function VideoConverterApp() {
  const {
    state,
    asciiLines,
    videoRef,
    sourceFileName,
    config,
    setConfig,
    loadFile,
    play,
    pause,
    reset,
    setIsExporting,
  } = useAsciiConverter()

  const [sizeMode, setSizeMode] = useState<ExportSizeMode>('original')

  const handleExportStart = useCallback(() => setIsExporting(true), [setIsExporting])
  const handleExportEnd = useCallback(() => setIsExporting(false), [setIsExporting])

  const videoReady = state.status === 'playing' || state.status === 'paused'
  const encoderPreloadStatus = useFfmpegPreload(videoReady)

  const { exportState, exportVideo, cancelExport, retryExport, isCancelling } = useAsciiExporter({
    videoRef,
    config,
    sourceFileName,
    onExportStart: handleExportStart,
    onExportEnd: handleExportEnd,
    pause,
  })

  const handleConfigChange = useCallback(
    (patch: Partial<typeof config>) => {
      setConfig(prev => ({ ...prev, ...patch }))
    },
    [setConfig],
  )

  const handleExport = useCallback(() => {
    exportVideo({ sizeMode, fps: 30 })
  }, [exportVideo, sizeMode])

  const hasVideo = state.status !== 'idle'
  const isExporting =
    exportState.status === 'loading-ffmpeg' ||
    exportState.status === 'rendering' ||
    exportState.status === 'encoding'

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="w-2 h-2 rounded-full bg-destructive/60" />
            <span className="w-2 h-2 rounded-full bg-amber-500/60" />
            <span className="w-2 h-2 rounded-full bg-phosphor/60" />
          </div>
          <h1 className="font-mono text-sm text-phosphor phosphor-glow tracking-widest">
            ASCII<span className="text-phosphor-dim">.FLUX</span>
          </h1>
        </div>
        <p className="font-mono text-xs text-muted-foreground hidden sm:block">
          VIDEO → ASCII · REAL-TIME RENDERER
        </p>
        {hasVideo && (
          <span
            className="font-mono text-xs text-phosphor-dim animate-pulse"
            aria-live="polite"
          >
            {isExporting ? '● EXPORT' : state.status === 'playing' ? '● REC' : '○ ---'}
          </span>
        )}
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col lg:flex-row gap-0">
        {/* Viewer area */}
        <section
          className="flex-1 flex flex-col items-center justify-center p-4 lg:p-6 min-h-[50vh] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-terminal-border"
          aria-label="ASCII output"
        >
          {!hasVideo ? (
            <VideoDropzone
              onFile={loadFile}
              className="w-full max-w-lg"
            />
          ) : state.status === 'loading' ? (
            <div className="flex flex-col items-center gap-4 text-phosphor-dim font-mono text-sm">
              <pre aria-hidden className="animate-pulse text-xs leading-tight">
                {[
                  '[ LOADING ]',
                  ' ░░░░░░░░░░',
                  ' DECODING..',
                ].join('\n')}
              </pre>
              <p>Loading video...</p>
            </div>
          ) : state.status === 'error' ? (
            <div className="flex flex-col items-center gap-3 text-destructive font-mono text-sm">
              <pre aria-hidden className="text-xs">
                {'[ ERROR ]\n! ABORT  !'}
              </pre>
              <p>{state.errorMessage ?? 'An error occurred.'}</p>
              <button
                onClick={reset}
                className="text-xs border border-destructive/50 px-3 py-1.5 rounded-sm hover:bg-destructive/10 transition-colors"
              >
                [ TRY AGAIN ]
              </button>
            </div>
          ) : (
            <div className="w-full">
              <AsciiViewer
                lines={asciiLines}
                colorMode={config.colorMode}
                className="w-full"
              />
            </div>
          )}
        </section>

        {/* Controls sidebar */}
        <aside className="w-full lg:w-64 xl:w-72 p-4 lg:p-6 flex-shrink-0">
          <ConverterControls
            config={config}
            state={state}
            onConfigChange={handleConfigChange}
            onPlay={play}
            onPause={pause}
            onReset={reset}
            disabled={isExporting}
          />

          {hasVideo && state.status !== 'loading' && state.status !== 'error' && (
            <ExportControls
              exportState={exportState}
              sizeMode={sizeMode}
              onSizeModeChange={setSizeMode}
              onExport={handleExport}
              onCancel={cancelExport}
              onRetry={retryExport}
              disabled={state.status !== 'playing' && state.status !== 'paused'}
              videoRef={videoRef}
              cols={config.cols}
              encoderPreloadStatus={encoderPreloadStatus}
              isCancelling={isCancelling}
            />
          )}

          {/* Load new video CTA */}
          {hasVideo && (
            <div className="mt-6 pt-4 border-t border-terminal-border">
              <VideoDropzone
                onFile={(file) => {
                  reset()
                  setTimeout(() => loadFile(file), 50)
                }}
                className="w-full"
              />
            </div>
          )}
        </aside>
      </main>

      {/* Hidden video element for decoding */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        className="sr-only"
        aria-hidden
      />
    </div>
  )
}
