export type AsciiColorMode = 'phosphor' | 'white' | 'amber'

export interface AsciiConverterConfig {
  /** Number of character columns in the ASCII output */
  cols: number
  /** Contrast multiplier 0.5–2.0 */
  contrast: number
  /** Brightness offset -128 to 128 */
  brightness: number
  /** Color mode of the ASCII output */
  colorMode: AsciiColorMode
  /** Whether the output is inverted (bright chars for dark pixels) */
  invert: boolean
}

export type ConverterStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export interface ConverterState {
  status: ConverterStatus
  fps: number
  frameCount: number
  errorMessage?: string
}

export type ExportSizeMode = 'original' | 'grid'

export interface ExportOptions {
  sizeMode: ExportSizeMode
  fps?: number
}

export type ExportStatus =
  | 'idle'
  | 'loading-ffmpeg'
  | 'rendering'
  | 'encoding'
  | 'done'
  | 'error'

export interface ExportState {
  status: ExportStatus
  progress: number
  phase?: 'frames' | 'encode'
  errorMessage?: string
}
