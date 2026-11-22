import { type Colour, hex, oklch } from "./colour.ts"
import type { Legend, Scene, Tone } from "./draw.ts"
import type { Bin } from "./scale.ts"

export interface Palette {
  // Shades and highlights take this colour's hue and chroma when the spec
  // gives no colour.
  readonly colour: Colour
  // OKLCH lightness, 0 to 1: of the shade nearest the surface, of the shade
  // farthest from it, and of a highlighted country.
  readonly lightness: {
    readonly near: number
    readonly far: number
    readonly accent: number
  }
  // The neutral class at the middle of a diverging scale.
  readonly middle: string
  readonly blank: string
  readonly context: string
  readonly land: string
  readonly stroke: string
  readonly surface: string
  readonly ink: string
  readonly muted: string
}

export const light: Palette = {
  colour: "#256abf",
  lightness: { near: 0.93, far: 0.36, accent: 0.53 },
  middle: "#f4ecca",
  blank: "#e1e0d9",
  context: "#e1e0d9",
  land: "#f0efec",
  stroke: "#fcfcfb",
  surface: "#fcfcfb",
  ink: "#0b0b0b",
  muted: "#52514e",
}

// On a dark surface the lowest values sit nearest the surface, so lightness
// runs the other way.
export const dark: Palette = {
  colour: "#256abf",
  lightness: { near: 0.44, far: 0.82, accent: 0.62 },
  middle: "#585340",
  blank: "#383835",
  context: "#383835",
  land: "#2c2c2a",
  stroke: "#1a1a19",
  surface: "#1a1a19",
  ink: "#f0efec",
  muted: "#c3c2b7",
}

// A palette for each colour scheme. Colours become CSS `light-dark()` pairs,
// and the page's `color-scheme` picks one.
export interface Schemes {
  readonly light: Palette
  readonly dark: Palette
}

// A colour from one palette, or a `light-dark()` pair when the two schemes
// differ.
const pick = (palette: Palette | Schemes, colour: (palette: Palette) => string) => {
  if (!("dark" in palette)) return colour(palette)

  const [day, night] = [colour(palette.light), colour(palette.dark)]

  return day === night ? day : `light-dark(${day},${night})`
}

const tint = (tone: Tone, palette: Palette): string => {
  switch (tone.kind) {
    case "blank":
      return palette.blank
    case "context":
      return palette.context
    case "middle":
      return palette.middle
    case "accent":
      return hex({ ...oklch(tone.colour ?? palette.colour), l: palette.lightness.accent })
    case "shade": {
      const { near, far } = palette.lightness

      return hex({
        ...oklch(tone.colour ?? palette.colour),
        l: near + (far - near) * tone.strength,
      })
    }
  }
}

export interface PaintOptions {
  readonly palette?: Palette | Schemes
}

// The colour of a tone in a palette. A shade keeps its colour's hue and
// chroma and takes its lightness from its strength, so a ramp reads in order
// on any surface.
export const paint = (tone: Tone, { palette = light }: PaintOptions = {}): string =>
  pick(palette, (each) => tint(tone, each))

const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

const numbers = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })

// A legend bin's values as text: "2 to 4", "Below 2", "10 and above".
export const range = ({ low, high }: Bin) => {
  if (low === undefined && high === undefined) return "All values"
  if (low === undefined) return `Below ${numbers.format(high ?? 0)}`
  if (high === undefined) return `${numbers.format(low)} and above`

  return low === high ? numbers.format(low) : `${numbers.format(low)} to ${numbers.format(high)}`
}

// Text sizes and gaps as a share of the sheet's width, so a map keeps its
// proportions at any size.
const units = (width: number) => ({
  title: width * 0.028,
  text: width * 0.015,
  small: width * 0.013,
  gap: width * 0.015,
  swatch: width * 0.016,
  slot: width * 0.11,
})

// What decides where svg() puts each part, and so the document's height.
export interface Parts {
  // The map's size in units: the scene's, or its sheet's before it loads.
  readonly width: number
  readonly height: number
  readonly title: boolean
  // Each inset's box, width by height.
  readonly insets: ReadonlyArray<readonly [number, number]>
  readonly legend: boolean
  // Lines of small print under the legend.
  readonly notes: number
}

// Where each part sits, top to bottom: the title's baseline, the map's top,
// each inset's box, the legend's top and each note's baseline, and the height
// of the whole document.
export const stack = (parts: Parts) => {
  const size = units(parts.width)
  const perRow = Math.max(1, Math.floor((parts.width + size.gap) / (size.slot + size.gap)))
  let y = 0
  let title: number | undefined

  if (parts.title) {
    y += size.title
    title = y
    y += size.gap
  }

  const map = y

  y += parts.height

  const boxes = parts.insets.map(([width, height], index) => ({
    x: (index % perRow) * (size.slot + size.gap),
    row: Math.floor(index / perRow),
    width: size.slot,
    height: (size.slot * height) / width,
  }))
  const insets: Array<{
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }> = []

  if (boxes.length > 0) {
    y += size.gap
    const rows = Math.max(...boxes.map((box) => box.row)) + 1
    const rowHeight = Math.max(...boxes.map((box) => box.height)) + size.small * 1.6

    for (const box of boxes) insets.push({ ...box, y: y + box.row * (rowHeight + size.gap) })

    y += rows * (rowHeight + size.gap)
  }

  let legend: number | undefined

  if (parts.legend) {
    y += size.gap
    legend = y
    y += size.swatch + size.gap
  }

  const notes: Array<number> = []

  for (let index = 0; index < parts.notes; index += 1) {
    y += size.small * 1.5
    notes.push(y)
  }

  return { title, map, insets, legend, notes, height: Math.ceil(y + size.small * 0.5) }
}

const legendItems = (legend: Legend, palette: Palette | Schemes) =>
  legend.bins.map((bin) => ({
    colour: paint(bin.shade, { palette }),
    text: range(bin),
  }))

export interface SvgOptions {
  readonly palette?: Palette | Schemes
}

// A scene as one standalone SVG document: title, map, insets, legend and
// credits. Use it for server rendering, link-preview images, email, or any
// page without a framework.
//
// With one palette the document paints its own surface. With `{ light, dark }`
// it has no background and follows the page: inline, it takes the page's
// `color-scheme` and text colour; as a file or an `<img>`, the reader's
// preference, where the browser passes it on.
export const svg = (scene: Scene, { palette = light }: SvgOptions = {}): string => {
  const { width } = scene
  const themed = "dark" in palette
  const ink = themed ? "currentColor" : palette.ink
  const muted = pick(palette, (each) => each.muted)
  const land = pick(palette, (each) => each.land)
  const stroke = pick(palette, (each) => each.stroke)
  const blank = pick(palette, (each) => each.blank)
  const size = units(width)
  const lines: Array<string> = []

  const notes = [
    ...(scene.missing.length === 0
      ? []
      : [
          `Too small to show: ${scene.rows
            .filter((row) => scene.missing.includes(row.country))
            .map((row) => row.name)
            .join(", ")}.`,
        ]),
    ...(scene.source === undefined ? [] : [`Data: ${scene.source}.`]),
    ...scene.credits.map(
      (credit) => `Boundaries: ${credit.publisher}, ${credit.vintage}. ${credit.license}.`,
    ),
  ]

  const at = stack({
    width,
    height: scene.height,
    title: scene.title !== undefined,
    insets: scene.insets.map((inset) => [inset.width, inset.height] as const),
    legend: scene.legend !== undefined,
    notes: notes.length,
  })

  const font = `font-family="system-ui, sans-serif"`

  if (scene.title !== undefined)
    lines.push(
      `<text x="0" y="${at.title}" ${font} font-size="${size.title}" font-weight="600" fill="${ink}">${escape(scene.title)}</text>`,
    )

  lines.push(
    `<g transform="translate(0 ${at.map})">`,
    `<path d="${scene.land}" fill="${land}"/>`,
    ...scene.shapes.map(
      (shape) =>
        `<path d="${shape.path}" data-country="${shape.country}" fill="${paint(shape.tone, { palette })}" stroke="${stroke}" stroke-width="0.5"><title>${escape(shape.label)}</title></path>`,
    ),
    ...scene.patches.map(
      (patch) =>
        `<path d="${patch.path}" data-area="${escape(patch.area)}" fill="${paint(patch.tone, { palette })}" stroke="${stroke}" stroke-width="0.5"><title>${escape(patch.label)}</title></path>`,
    ),
    ...scene.borders.map(
      (border) =>
        `<path d="${border.path}" data-area="${escape(border.code)}" fill="none" stroke="${stroke}" stroke-width="1.5"><title>${escape(border.name)}</title></path>`,
    ),
    `</g>`,
  )

  for (const [index, inset] of scene.insets.entries()) {
    const box = at.insets[index]

    if (box === undefined) continue

    lines.push(
      `<svg x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" viewBox="0 0 ${inset.width} ${inset.height}">`,
      `<rect width="${inset.width}" height="${inset.height}" fill="none" stroke="${blank}"/>`,
      `<path d="${inset.path}" data-country="${inset.country}" data-inset="${escape(inset.name)}" fill="${paint(inset.tone, { palette })}" stroke="${stroke}" stroke-width="1.5"><title>${escape(inset.label)}</title></path>`,
      ...inset.patches.map(
        (patch) =>
          `<path d="${patch.path}" data-area="${escape(patch.area)}" fill="${paint(patch.tone, { palette })}" stroke="${stroke}" stroke-width="1.5"><title>${escape(patch.label)}</title></path>`,
      ),
      ...inset.borders.map(
        (border) =>
          `<path d="${border.path}" data-area="${escape(border.code)}" fill="none" stroke="${stroke}" stroke-width="1.5"><title>${escape(border.name)}</title></path>`,
      ),
      `</svg>`,
      `<text x="${box.x}" y="${box.y + box.height + size.small * 1.2}" ${font} font-size="${size.small}" fill="${muted}">${escape(inset.name)}</text>`,
    )
  }

  if (scene.legend !== undefined && at.legend !== undefined) {
    const y = at.legend
    let x = 0
    const baseline = y + size.swatch * 0.8

    if (scene.legend.better !== undefined) {
      const text = scene.legend.better === "higher" ? "Higher is better" : "Lower is better"

      lines.push(
        `<text x="${x}" y="${baseline}" ${font} font-size="${size.text}" fill="${ink}">${text}</text>`,
      )
      x += text.length * size.text * 0.55 + size.gap * 2
    }

    const items = [
      ...legendItems(scene.legend, palette),
      ...(scene.shapes.some((shape) => shape.tone.kind === "blank")
        ? [{ colour: blank, text: "No data" }]
        : []),
    ]

    for (const item of items) {
      lines.push(
        `<rect x="${x}" y="${y}" width="${size.swatch}" height="${size.swatch}" rx="${size.swatch * 0.2}" fill="${item.colour}"/>`,
        `<text x="${x + size.swatch * 1.4}" y="${baseline}" ${font} font-size="${size.text}" fill="${muted}">${escape(item.text)}</text>`,
      )
      x += size.swatch * 1.4 + item.text.length * size.text * 0.55 + size.gap * 1.5
    }
  }

  for (const [index, note] of notes.entries())
    lines.push(
      `<text x="0" y="${at.notes[index]}" ${font} font-size="${size.small}" fill="${muted}">${escape(note)}</text>`,
    )

  const { height } = at

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">`,
    `<title>${escape(scene.title ?? scene.description)}</title>`,
    `<desc>${escape(scene.description)}</desc>`,
    // Inline, `svg:root` matches nothing and the page's scheme holds.
    themed
      ? `<style>svg:root{color-scheme:light dark}</style>`
      : `<rect width="${width}" height="${height}" fill="${palette.surface}"/>`,
    ...lines,
    `</svg>`,
  ].join("")
}
