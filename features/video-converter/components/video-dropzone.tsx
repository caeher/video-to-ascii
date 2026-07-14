'use client'

import { cn } from '@/lib/utils'
import { useCallback, useRef, useState } from 'react'

interface VideoDropzoneProps {
  onFile: (file: File) => void
  className?: string
}

const ACCEPTED = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska']

export function VideoDropzone({ onFile, className }: VideoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(mp4|webm|ogv|mov|mkv)$/i)) {
        setError('Unsupported format. Use MP4, WebM, OGV, MOV, or MKV.')
        return
      }
      setError(null)
      onFile(file)
    },
    [onFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const onDragLeave = () => setIsDragging(false)

  const onClick = () => inputRef.current?.click()

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button
        type="button"
        onClick={onClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        aria-label="Upload video file"
        className={cn(
          'relative flex flex-col items-center justify-center gap-4 w-full',
          'border border-dashed border-terminal-border rounded-sm',
          'p-12 cursor-pointer transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          isDragging
            ? 'border-phosphor bg-phosphor/5 border-solid'
            : 'hover:border-phosphor-dim hover:bg-phosphor/[0.02]',
        )}
      >
        {/* ASCII art upload icon */}
        <pre
          aria-hidden
          className={cn(
            'font-mono text-xs leading-tight select-none transition-colors',
            isDragging ? 'text-phosphor phosphor-glow' : 'text-phosphor-dim',
          )}
        >
          {[
            '  +-------+  ',
            '  |  >>>  |  ',
            '  | VIDEO |  ',
            '  |  >>>  |  ',
            '  +---+---+  ',
            '      |      ',
            '   [DROP]    ',
          ].join('\n')}
        </pre>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className={cn('text-sm transition-colors', isDragging ? 'text-phosphor' : 'text-phosphor-dim')}>
            {isDragging ? 'RELEASE TO LOAD FILE' : 'DRAG & DROP VIDEO'}
          </p>
          <p className="text-xs text-muted-foreground">
            or{' '}
            <span className="text-phosphor underline underline-offset-2">browse files</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">MP4 · WebM · MOV · MKV</p>
        </div>
      </button>

      {error && (
        <p role="alert" className="text-xs text-destructive font-mono px-1">
          ERR: {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={onInputChange}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
    </div>
  )
}
