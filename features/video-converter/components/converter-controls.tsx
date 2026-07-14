'use client'

import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { AsciiColorMode, AsciiConverterConfig, ConverterState } from '../types'

interface ConverterControlsProps {
  config: AsciiConverterConfig
  state: ConverterState
  onConfigChange: (patch: Partial<AsciiConverterConfig>) => void
  onPlay: () => void
  onPause: () => void
  onReset: () => void
}

const COLOR_MODES: { value: AsciiColorMode; label: string }[] = [
  { value: 'phosphor', label: 'PHOSPHOR' },
  { value: 'white', label: 'WHITE' },
  { value: 'amber', label: 'AMBER' },
]

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground tracking-widest uppercase">{label}</span>
      {children}
    </div>
  )
}

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

export function ConverterControls({
  config,
  state,
  onConfigChange,
  onPlay,
  onPause,
  onReset,
}: ConverterControlsProps) {
  const isPlaying = state.status === 'playing'
  const isActive = state.status === 'playing' || state.status === 'paused'

  return (
    <aside className="flex flex-col gap-5 w-full">
      {/* Playback */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground tracking-widest uppercase">Playback</span>
        <div className="flex gap-2 flex-wrap">
          <TerminalButton
            onClick={isPlaying ? onPause : onPlay}
            disabled={!isActive}
            active={isPlaying}
          >
            {isPlaying ? '[ PAUSE ]' : '[ PLAY  ]'}
          </TerminalButton>
          <TerminalButton onClick={onReset} disabled={state.status === 'idle'}>
            [ RESET ]
          </TerminalButton>
        </div>
      </div>

      {/* Resolution */}
      <ControlRow label={`Resolution — ${config.cols} cols`}>
        <Slider
          min={40}
          max={240}
          step={4}
          value={[config.cols]}
          onValueChange={([v]) => onConfigChange({ cols: v })}
          aria-label="Character columns"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>40</span>
          <span>240</span>
        </div>
      </ControlRow>

      {/* Contrast */}
      <ControlRow label={`Contrast — ${config.contrast.toFixed(1)}x`}>
        <Slider
          min={0.5}
          max={3}
          step={0.1}
          value={[config.contrast]}
          onValueChange={([v]) => onConfigChange({ contrast: v })}
          aria-label="Contrast"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5</span>
          <span>3.0</span>
        </div>
      </ControlRow>

      {/* Brightness */}
      <ControlRow label={`Brightness — ${config.brightness > 0 ? '+' : ''}${config.brightness}`}>
        <Slider
          min={-80}
          max={80}
          step={4}
          value={[config.brightness]}
          onValueChange={([v]) => onConfigChange({ brightness: v })}
          aria-label="Brightness"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>-80</span>
          <span>+80</span>
        </div>
      </ControlRow>

      {/* Color mode */}
      <ControlRow label="Color mode">
        <div className="flex gap-2 flex-wrap">
          {COLOR_MODES.map(({ value, label }) => (
            <TerminalButton
              key={value}
              onClick={() => onConfigChange({ colorMode: value })}
              active={config.colorMode === value}
            >
              {label}
            </TerminalButton>
          ))}
        </div>
      </ControlRow>

      {/* Invert */}
      <ControlRow label="Invert">
        <TerminalButton
          onClick={() => onConfigChange({ invert: !config.invert })}
          active={config.invert}
        >
          {config.invert ? '[ ON  ]' : '[ OFF ]'}
        </TerminalButton>
      </ControlRow>

      {/* Stats */}
      <div className="mt-auto pt-4 border-t border-terminal-border flex flex-col gap-1">
        <p className="text-xs text-muted-foreground tracking-widest uppercase">Stats</p>
        <div className="font-mono text-xs text-phosphor-dim space-y-0.5">
          <p>
            STATUS{' '}
            <span
              className={cn(
                state.status === 'playing' ? 'text-phosphor' : 'text-muted-foreground',
              )}
            >
              {state.status.toUpperCase()}
            </span>
          </p>
          <p>
            FPS{' '}
            <span className={state.status === 'playing' ? 'text-phosphor' : 'text-muted-foreground'}>
              {state.fps}
            </span>
          </p>
          <p>
            FRAMES{' '}
            <span className="text-muted-foreground">{state.frameCount.toLocaleString()}</span>
          </p>
        </div>
      </div>
    </aside>
  )
}
