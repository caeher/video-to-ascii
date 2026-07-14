'use client'

import { cn } from '@/lib/utils'
import { memo } from 'react'
import type { AsciiColorMode } from '../types'

interface AsciiViewerProps {
  lines: string[]
  colorMode: AsciiColorMode
  className?: string
}

const COLOR_CLASS: Record<AsciiColorMode, string> = {
  phosphor: 'text-phosphor',
  white: 'text-white/90',
  amber: 'text-amber-400',
}

const GLOW_CLASS: Record<AsciiColorMode, string> = {
  phosphor: 'phosphor-glow',
  white: '',
  amber: '[text-shadow:0_0_8px_theme(colors.amber.400),0_0_20px_oklch(0.83_0.18_85/0.4)]',
}

export const AsciiViewer = memo(function AsciiViewer({
  lines,
  colorMode,
  className,
}: AsciiViewerProps) {
  if (lines.length === 0) return null

  return (
    <div
      aria-label="ASCII video output"
      role="img"
      className={cn(
        'w-full overflow-hidden rounded-sm bg-terminal scanlines',
        className,
      )}
    >
      <pre
        className={cn(
          'font-mono leading-none select-none',
          // Scale font so the full width always fits
          'text-[clamp(3px,0.62vw,8px)]',
          COLOR_CLASS[colorMode],
          GLOW_CLASS[colorMode],
        )}
        style={{ letterSpacing: '0.05em' }}
      >
        {lines.join('\n')}
      </pre>
    </div>
  )
})
