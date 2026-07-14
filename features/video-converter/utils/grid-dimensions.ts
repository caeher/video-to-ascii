import type { ExportSizeMode } from '../types'

export function getAsciiGridSize(videoWidth: number, videoHeight: number, cols: number) {
  const aspect = videoHeight / videoWidth
  const rows = Math.floor(cols * aspect * 0.45)
  return { cols, rows }
}

export function getExportDimensions(
  videoWidth: number,
  videoHeight: number,
  cols: number,
  sizeMode: ExportSizeMode,
) {
  const { cols: c, rows } = getAsciiGridSize(videoWidth, videoHeight, cols)
  if (sizeMode === 'original') {
    return { width: videoWidth, height: videoHeight, cols: c, rows }
  }
  return { width: c, height: rows, cols: c, rows }
}
