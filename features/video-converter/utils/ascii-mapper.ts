/**
 * Maps pixel brightness to ASCII characters.
 * Dense ramp: dark → bright
 */
const RAMP = ' .\'`^",:;Il!i><~+_-?][}{1)(|\\^/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$'
const RAMP_LEN = RAMP.length

/**
 * Returns the ASCII character that corresponds to a brightness value 0–255.
 */
export function brightnessToChar(brightness: number, invert: boolean): string {
  const b = Math.max(0, Math.min(255, brightness))
  const index = invert
    ? Math.floor(((255 - b) / 255) * (RAMP_LEN - 1))
    : Math.floor((b / 255) * (RAMP_LEN - 1))
  return RAMP[index]
}

/**
 * Applies contrast and brightness adjustments to a 0-255 value.
 */
export function adjustPixel(value: number, contrast: number, brightness: number): number {
  // Contrast: pivot at 128
  let v = (value - 128) * contrast + 128
  // Brightness offset
  v += brightness
  return Math.max(0, Math.min(255, v))
}

/**
 * Converts RGBA pixel data from a canvas into a 2D array of ASCII chars.
 */
export function pixelsToAscii(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  contrast: number,
  brightness: number,
  invert: boolean,
): string[] {
  const lines: string[] = []

  for (let y = 0; y < height; y++) {
    let line = ''
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      // Luminance (perceptual grayscale)
      const luma = 0.299 * r + 0.587 * g + 0.114 * b
      const adjusted = adjustPixel(luma, contrast, brightness)
      line += brightnessToChar(adjusted, invert)
    }
    lines.push(line)
  }

  return lines
}
