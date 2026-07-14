'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ExportSizeMode, ExportState } from '../types'
import type { FfmpegPreloadStatus } from '../hooks/use-ffmpeg-preload'
import { getExportEstimate, DEFAULT_FPS } from '../utils/frame-generator'

interface ExportControlsProps {
  exportState: ExportState
  sizeMode: ExportSizeMode
  onSizeModeChange: (mode: ExportSizeMode) => void
  onExport: () => void
  onCancel: () => void
  onRetry: () => void
  disabled: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  cols: number
  encoderPreloadStatus?: FfmpegPreloadStatus
  isCancelling?: boolean
}

const SIZE_MODES: { value: ExportSizeMode; label: string }[] = [
  { value: 'original', label: 'ORIGINAL' },
  { value: 'grid', label: 'GRID' },
]

function TerminalButton({
  onClick,
  disabled,
  active,
  children,
  className,
}: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'font-mono text-xs px-3 py-1.5 border rounded-sm transition-all',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        active
          ? 'border-phosphor text-phosphor bg-phosphor/10 btn-glow'
          : 'border-terminal-border text-muted-foreground hover:border-phosphor-dim hover:text-phosphor-dim',
        className,
      )}
    >
      {children}
    </button>
  )
}

function getEncoderPreloadLabel(status: FfmpegPreloadStatus): string | null {
  switch (status) {
    case 'loading':
      return 'Preparing encoder...'
    case 'ready':
      return 'Encoder ready'
    case 'error':
      return 'Encoder will load on first export'
    default:
      return null
  }
}

function getStatusLabel(exportState: ExportState): string {
  switch (exportState.status) {
    case 'loading-ffmpeg':
      return 'LOADING ENCODER...'
    case 'rendering':
      if (exportState.frameIndex && exportState.totalFrames) {
        return `RENDERING frame ${exportState.frameIndex}/${exportState.totalFrames} · ${Math.round(exportState.progress)}%`
      }
      return `RENDERING ${Math.round(exportState.progress)}%`
    case 'encoding':
      return `ENCODING ${Math.round(exportState.progress)}%`
    case 'done':
      return exportState.downloadFormat === 'webm'
        ? '✓ DOWNLOADED (WEBM)'
        : '✓ DOWNLOADED (MP4)'
    case 'cancelled':
      return 'EXPORT CANCELLED'
    case 'error':
      return 'EXPORT FAILED'
    default:
      return ''
  }
}

export function ExportControls({
  exportState,
  sizeMode,
  onSizeModeChange,
  onExport,
  onCancel,
  onRetry,
  disabled,
  videoRef,
  cols,
  encoderPreloadStatus = 'idle',
  isCancelling = false,
}: ExportControlsProps) {
  const isExporting =
    exportState.status === 'loading-ffmpeg' ||
    exportState.status === 'rendering' ||
    exportState.status === 'encoding'

  const estimate = getExportEstimate(videoRef.current, cols, sizeMode, DEFAULT_FPS)
  const encoderLabel = getEncoderPreloadLabel(encoderPreloadStatus)

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-terminal-border">
      <span className="text-xs text-muted-foreground tracking-widest uppercase">Export</span>

      {encoderLabel && !isExporting && (
        <p
          className={cn(
            'font-mono text-xs',
            encoderPreloadStatus === 'ready' ? 'text-phosphor-dim' : 'text-muted-foreground',
          )}
        >
          {encoderLabel}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground tracking-widest uppercase">Size</span>
        <div className="flex gap-2 flex-wrap">
          {SIZE_MODES.map(({ value, label }) => (
            <TerminalButton
              key={value}
              onClick={() => onSizeModeChange(value)}
              active={sizeMode === value}
              disabled={disabled || isExporting}
            >
              {`[ ${label} ]`}
            </TerminalButton>
          ))}
        </div>
        {estimate && (
          <p className="font-mono text-xs text-muted-foreground">
            ~{estimate.totalFrames} frames · {estimate.width}×{estimate.height}px
          </p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <TerminalButton onClick={onExport} disabled={disabled || isExporting} active={isExporting}>
          [ EXPORT MP4 ]
        </TerminalButton>
        {isExporting && (
          <TerminalButton
            onClick={onCancel}
            disabled={isCancelling}
            className="border-destructive/50 text-destructive"
          >
            {isCancelling ? '[ CANCELLING... ]' : '[ CANCEL ]'}
          </TerminalButton>
        )}
        {exportState.status === 'error' && (
          <TerminalButton onClick={onRetry} active>
            [ RETRY ]
          </TerminalButton>
        )}
      </div>

      {isExporting && (
        <div className="flex flex-col gap-1.5">
          <Progress value={exportState.progress} aria-label="Export progress" />
          <p className="font-mono text-xs text-phosphor-dim">{getStatusLabel(exportState)}</p>
          {exportState.status === 'loading-ffmpeg' && (
            <p className="font-mono text-xs text-muted-foreground">
              First export downloads ~31 MB encoder — may take 1–2 min
            </p>
          )}
          {exportState.infoMessage && exportState.status !== 'loading-ffmpeg' && (
            <p className="font-mono text-xs text-amber-400">{exportState.infoMessage}</p>
          )}
        </div>
      )}

      {exportState.status === 'done' && (
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs text-phosphor">{getStatusLabel(exportState)}</p>
          {exportState.infoMessage && (
            <p className="font-mono text-xs text-amber-400">{exportState.infoMessage}</p>
          )}
        </div>
      )}

      {exportState.status === 'cancelled' && (
        <p className="font-mono text-xs text-muted-foreground">{getStatusLabel(exportState)}</p>
      )}

      {exportState.status === 'error' && (
        <p className="font-mono text-xs text-destructive">
          {exportState.errorMessage ?? 'Export failed.'}
        </p>
      )}
    </div>
  )
}
