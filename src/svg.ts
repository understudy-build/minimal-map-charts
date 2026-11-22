import { type Colour, hex, oklch } from "./colour.ts"
import type { Inset, Legend, Scene, Tone } from "./draw.ts"
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

export interface PaintOptions {
  readonly palette?: Palette
}

// The colour of a tone in a palette. A shade keeps its colour's hue and
// chroma and takes its lightness from its strength, so a ramp reads in order
// on any surface.
export const paint = (tone: Tone, { palette = light }: PaintOptions = {}): string => {
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

const insetRows = (insets: ReadonlyArray<Inset>, width: number) => {
  const { slot, gap, small } = units(width)
  const perRow = Math.max(1, Math.floor((width + gap) / (slot + gap)))

  return insets.map((inset, index) => {
    const row = Math.floor(index / perRow)
    const height = (slot * inset.height) / inset.width

    return {
      inset,
      x: (index % perRow) * (slot + gap),
      row,
      width: slot,
      height,
      label: small,
    }
  })
}

const legendItems = (legend: Legend, palette: Palette) =>
  legend.bins.map((bin) => ({
    colour: paint(bin.shade, { palette }),
    text: range(bin),
  }))

export interface SvgOptions {
  readonly palette?: Palette
}

// A scene as one standalone SVG document: title, map, insets, legend and
// credits. Use it for server rendering, link-preview images, email, or any
// page without a framework.
export const svg = (scene: Scene, { palette = light }: SvgOptions = {}): string => {
  const { width } = scene
  const size = units(width)
  const lines: Array<string> = []
  let y = 0

  const font = `font-family="system-ui, sans-serif"`

  if (scene.title !== undefined) {
    y += size.title
    lines.push(
      `<text x="0" y="${y}" ${font} font-size="${size.title}" font-weight="600" fill="${palette.ink}">${escape(scene.title)}</text>`,
    )
    y += size.gap
  }

  lines.push(
    `<g transform="translate(0 ${y})">`,
    `<path d="${scene.land}" fill="${palette.land}"/>`,
    ...scene.shapes.map(
      (shape) =>
        `<path d="${shape.path}" data-country="${shape.country}" fill="${paint(shape.tone, { palette })}" stroke="${palette.stroke}" stroke-width="0.5"><title>${escape(shape.label)}</title></path>`,
    ),
    ...scene.borders.map(
      (border) =>
        `<path d="${border.path}" data-area="${escape(border.code)}" fill="none" stroke="${palette.stroke}" stroke-width="1.5"><title>${escape(border.name)}</title></path>`,
    ),
    `</g>`,
  )

  y += scene.height

  const placed = insetRows(scene.insets, width)

  if (placed.length > 0) {
    y += size.gap
    const rows = Math.max(...placed.map((each) => each.row)) + 1
    const rowHeight = Math.max(...placed.map((each) => each.height)) + size.small * 1.6

    for (const each of placed) {
      const top = y + each.row * (rowHeight + size.gap)

      lines.push(
        `<svg x="${each.x}" y="${top}" width="${each.width}" height="${each.height}" viewBox="0 0 ${each.inset.width} ${each.inset.height}">`,
        `<rect width="${each.inset.width}" height="${each.inset.height}" fill="none" stroke="${palette.blank}"/>`,
        `<path d="${each.inset.path}" data-country="${each.inset.country}" data-inset="${escape(each.inset.name)}" fill="${paint(each.inset.tone, { palette })}" stroke="${palette.stroke}" stroke-width="1.5"><title>${escape(each.inset.label)}</title></path>`,
        ...each.inset.borders.map(
          (border) =>
            `<path d="${border.path}" data-area="${escape(border.code)}" fill="none" stroke="${palette.stroke}" stroke-width="1.5"><title>${escape(border.name)}</title></path>`,
        ),
        `</svg>`,
        `<text x="${each.x}" y="${top + each.height + each.label * 1.2}" ${font} font-size="${each.label}" fill="${palette.muted}">${escape(each.inset.name)}</text>`,
      )
    }

    y += rows * (rowHeight + size.gap)
  }

  if (scene.legend !== undefined) {
    y += size.gap
    let x = 0
    const baseline = y + size.swatch * 0.8

    if (scene.legend.better !== undefined) {
      const text = scene.legend.better === "higher" ? "Higher is better" : "Lower is better"

      lines.push(
        `<text x="${x}" y="${baseline}" ${font} font-size="${size.text}" fill="${palette.ink}">${text}</text>`,
      )
      x += text.length * size.text * 0.55 + size.gap * 2
    }

    const items = [
      ...legendItems(scene.legend, palette),
      ...(scene.shapes.some((shape) => shape.tone.kind === "blank")
        ? [{ colour: palette.blank, text: "No data" }]
        : []),
    ]

    for (const item of items) {
      lines.push(
        `<rect x="${x}" y="${y}" width="${size.swatch}" height="${size.swatch}" rx="${size.swatch * 0.2}" fill="${item.colour}"/>`,
        `<text x="${x + size.swatch * 1.4}" y="${baseline}" ${font} font-size="${size.text}" fill="${palette.muted}">${escape(item.text)}</text>`,
      )
      x += size.swatch * 1.4 + item.text.length * size.text * 0.55 + size.gap * 1.5
    }

    y += size.swatch + size.gap
  }

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

  for (const note of notes) {
    y += size.small * 1.5
    lines.push(
      `<text x="0" y="${y}" ${font} font-size="${size.small}" fill="${palette.muted}">${escape(note)}</text>`,
    )
  }

  const height = Math.ceil(y + size.small * 0.5)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">`,
    `<title>${escape(scene.title ?? scene.description)}</title>`,
    `<desc>${escape(scene.description)}</desc>`,
    `<rect width="${width}" height="${height}" fill="${palette.surface}"/>`,
    ...lines,
    `</svg>`,
  ].join("")
}
