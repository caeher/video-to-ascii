import type { AsciiColorMode } from '../types'

const TERMINAL_BG = '#0a0f0a'

const COLOR_MAP: Record<AsciiColorMode, { fill: string; glow?: string }> = {
  phosphor: { fill: '#5cdb7a', glow: '#5cdb7a' },
  white: { fill: 'rgba(255,255,255,0.9)' },
  amber: { fill: '#fbbf24', glow: '#fbbf24' },
}

const MIN_CELL_PX = 6

export interface RenderAsciiOptions {
  width: number
  height: number
  cols: number
  rows: number
  colorMode: AsciiColorMode
  fontFamily?: string
}

export function renderAsciiToCanvas(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  options: RenderAsciiOptions,
): void {
  const {
    width,
    height,
    cols,
    rows,
    colorMode,
    fontFamily = '"Space Mono", monospace',
  } = options

  const charW = width / cols
  const charH = height / rows

  if (charH < MIN_CELL_PX) {
    const scaleW = cols * MIN_CELL_PX
    const scaleH = rows * MIN_CELL_PX
    const offscreen = document.createElement('canvas')
    offscreen.width = scaleW
    offscreen.height = scaleH
    const offCtx = offscreen.getContext('2d')
    if (!offCtx) return

    drawAscii(offCtx, lines, {
      width: scaleW,
      height: scaleH,
      cols,
      rows,
      colorMode,
      fontFamily,
    })

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(offscreen, 0, 0, width, height)
    return
  }

  drawAscii(ctx, lines, { width, height, cols, rows, colorMode, fontFamily })
}

function drawAscii(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  options: RenderAsciiOptions,
): void {
  const { width, height, cols, rows, colorMode, fontFamily = '"Space Mono", monospace' } =
    options

  const colors = COLOR_MAP[colorMode]
  const charH = height / rows
  const fontSize = charH

  ctx.fillStyle = TERMINAL_BG
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = colors.fill
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textBaseline = 'top'

  if (colors.glow) {
    ctx.shadowColor = colors.glow
    ctx.shadowBlur = Math.max(2, fontSize * 0.15)
  } else {
    ctx.shadowBlur = 0
  }

  for (let y = 0; y < lines.length; y++) {
    ctx.fillText(lines[y], 0, y * charH)
  }

  ctx.shadowBlur = 0
}
