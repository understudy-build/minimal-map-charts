// Colours in OKLCH, where equal steps in lightness look equal. A spec's colour
// gives the hue and chroma; the palette gives the lightness, which depends on
// the surface the map sits on.

// A colour as "#rrggbb". `parse` checks the digits; the type keeps specs
// written in code as plain literals.
export type Colour = `#${string}`

// Lightness from 0 (black) to 1 (white), chroma from 0 (grey) up, hue in
// degrees.
export interface Oklch {
  readonly l: number
  readonly c: number
  readonly h: number
}

const toLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

const toGamma = (channel: number) =>
  channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055

// Reads "#rrggbb".
export const oklch = (colour: string): Oklch => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((at) =>
    toLinear(Number.parseInt(colour.slice(at, at + 2), 16) / 255),
  )
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const hue = (Math.atan2(bb, a) * 180) / Math.PI

  return { l: lightness, c: Math.hypot(a, bb), h: hue < 0 ? hue + 360 : hue }
}

const toRgb = ({ l, c, h }: Oklch): readonly [number, number, number] => {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const ll = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    4.0767416621 * ll - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * ll + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * ll - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (colour: Oklch) =>
  toRgb(colour).every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4)

// The colour with the most chroma, up to its own, that sRGB can show at its
// lightness and hue.
const fit = (colour: Oklch): Oklch => {
  if (inGamut(colour)) return colour

  let low = 0
  let high = colour.c

  for (let step = 0; step < 16; step++) {
    const c = (low + high) / 2

    if (inGamut({ ...colour, c })) low = c
    else high = c
  }

  return { ...colour, c: low }
}

// Writes "#rrggbb", lowering chroma until the colour fits in sRGB so the hue
// and lightness hold.
export const hex = (colour: Oklch): Colour =>
  `#${toRgb(fit(colour))
    .map((channel) =>
      Math.round(Math.min(1, Math.max(0, toGamma(Math.max(0, channel)))) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`

// How far apart two hues are on the colour wheel, in degrees.
export const apart = (left: Oklch, right: Oklch) => {
  const turn = Math.abs(left.h - right.h) % 360

  return turn > 180 ? 360 - turn : turn
}
