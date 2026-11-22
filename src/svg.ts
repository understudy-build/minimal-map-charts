import { type Colour, hex, oklch } from "./colour.ts"
import type { Legend, Mark, Scene, Tone } from "./draw.ts"
import { legendHeight } from "./points.ts"
import type { Bin } from "./scale.ts"

export interface Palette {
  // Shades and highlights take this colour's hue and chroma when the spec
  // gives no colour.
  readonly colour: Colour
  // Points take this colour's hue and chroma when the spec gives none: far
  // from the default blue, so they stand out on any fill.
  readonly point: Colour
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
  point: "#d9480f",
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
  point: "#d9480f",
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
    case "point":
      return hex({ ...oklch(tone.colour ?? palette.point), l: palette.lightness.accent })
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
  // The least radius a point answers the pointer within.
  hit: width * 0.006,
})

// Past this many points, names would crowd the map: they stay in tooltips
// and the table.
const maxLabels = 12

// The legend a map's points take: circles for bubbles, a swatch for dots
// that say what they are, none for dots that do not.
export const key = (
  points: { readonly kind: "dot" | "bubble"; readonly label?: string | undefined } | undefined,
): Parts["points"] =>
  points === undefined || (points.kind === "dot" && points.label === undefined)
    ? undefined
    : points.kind

const round = (value: number) => Math.round(value * 100) / 100

// What decides where svg() puts each part, and so the document's height.
export interface Parts {
  // The map's size in units: the scene's, or its sheet's before it loads.
  readonly width: number
  readonly height: number
  readonly title: boolean
  // Each inset's box, width by height.
  readonly insets: ReadonlyArray<readonly [number, number]>
  readonly legend: boolean
  // The points' legend: a swatch row for dots, a row of circles for
  // bubbles, or none.
  readonly points: "dot" | "bubble" | undefined
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

  let points: number | undefined

  if (parts.points !== undefined) {
    y += size.gap
    points = y
    y += (parts.points === "dot" ? size.swatch : legendHeight(parts.width)) + size.gap
  }

  const notes: Array<number> = []

  for (let index = 0; index < parts.notes; index += 1) {
    y += size.small * 1.5
    notes.push(y)
  }

  return { title, map, insets, legend, points, notes, height: Math.ceil(y + size.small * 0.5) }
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
    ...(scene.points?.credit === undefined
      ? []
      : [
          `Places: ${scene.points.credit.publisher}, ${scene.points.credit.vintage}. ${scene.points.credit.license}.`,
        ]),
  ]

  const at = stack({
    width,
    height: scene.height,
    title: scene.title !== undefined,
    insets: scene.insets.map((inset) => [inset.width, inset.height] as const),
    legend: scene.legend !== undefined,
    points: key(scene.points),
    notes: notes.length,
  })

  const font = `font-family="system-ui, sans-serif"`
  const surface = pick(palette, (each) => each.surface)
  const pointed = scene.points === undefined ? ink : paint(scene.points.tone, { palette })
  const bubbles = scene.points?.kind === "bubble"

  // A point's circle in a frame drawn `scale` map units to each of its own,
  // under a wider transparent one where the circle is too small to point at.
  // A bubble of 0 is a ring.
  const circle = (each: Mark, scale: number) => {
    const r = each.radius / scale
    const hit = size.hit / scale
    const empty = bubbles && each.value === 0
    const shape = `cx="${each.x}" cy="${each.y}"`

    return [
      `<g data-site="${escape(each.name)}"><title>${escape(each.label)}</title>`,
      hit > r ? `<circle ${shape} r="${round(hit)}" fill="transparent"/>` : "",
      `<circle ${shape} r="${round(r)}" fill="${empty ? "none" : pointed}"${bubbles && !empty ? ` fill-opacity="0.85"` : ""} stroke="${empty ? pointed : stroke}" stroke-width="${round(1 / scale)}"/>`,
      `</g>`,
    ].join("")
  }

  // Each point's name to its right, else to its left, largest first, unless
  // it would cover an earlier name or leave the map.
  const named: Array<readonly [number, number, number, number]> = []
  const labels =
    scene.marks.length > maxLabels
      ? []
      : scene.marks.flatMap((each) => {
          const long = each.name.length * size.small * 0.55
          const away = each.radius + size.gap * 0.3
          const box = [each.x + away, each.x - away - long]
            .map(
              (x) => [x, each.y - size.small * 0.6, x + long, each.y + size.small * 0.6] as const,
            )
            .find(
              (candidate) =>
                candidate[0] >= 0 &&
                candidate[2] <= width &&
                !named.some(
                  ([left, top, right, bottom]) =>
                    candidate[0] < right &&
                    candidate[2] > left &&
                    candidate[1] < bottom &&
                    candidate[3] > top,
                ),
            )

          if (box === undefined) return []

          named.push(box)

          return [
            `<text x="${round(box[0])}" y="${round(each.y + size.small * 0.35)}" ${font} font-size="${size.small}" fill="${ink}" stroke="${surface}" stroke-width="${round(size.small * 0.25)}" stroke-linejoin="round" paint-order="stroke">${escape(each.name)}</text>`,
          ]
        })

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
    ...scene.marks.map((each) => circle(each, 1)),
    ...labels,
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
      ...inset.marks.map((each) => circle(each, box.width / inset.width)),
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

  if (scene.points !== undefined && at.points !== undefined) {
    const { label, sizes } = scene.points
    const y = at.points
    let x = 0

    if (scene.points.kind === "dot") {
      const r = size.swatch / 2

      lines.push(
        `<circle cx="${r}" cy="${y + r}" r="${round(r * 0.7)}" fill="${pointed}" stroke="${stroke}"/>`,
        `<text x="${size.swatch * 1.4}" y="${y + size.swatch * 0.8}" ${font} font-size="${size.text}" fill="${muted}">${escape(label ?? "")}</text>`,
      )
    } else {
      const bottom = y + legendHeight(width)

      if (label !== undefined) {
        lines.push(
          `<text x="0" y="${round(bottom - size.text * 0.3)}" ${font} font-size="${size.text}" fill="${ink}">${escape(label)}</text>`,
        )
        x += label.length * size.text * 0.55 + size.gap * 2
      }

      for (const { value, radius } of sizes) {
        const text = numbers.format(value)

        lines.push(
          `<circle cx="${round(x + radius)}" cy="${round(bottom - radius)}" r="${radius}" fill="${pointed}" fill-opacity="0.85" stroke="${stroke}"/>`,
          `<text x="${round(x + radius * 2 + size.gap * 0.4)}" y="${round(bottom - size.text * 0.3)}" ${font} font-size="${size.text}" fill="${muted}">${escape(text)}</text>`,
        )
        x += radius * 2 + size.gap * 0.4 + text.length * size.text * 0.55 + size.gap * 1.5
      }
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
