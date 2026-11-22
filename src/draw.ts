import type { Colour } from "./colour.ts"
import type { Frame } from "./compose.ts"
import { type Country, countries, names } from "./countries.ts"
import { frames } from "./frame.ts"
import type { Layout } from "./layout.ts"
import { regions } from "./regions.ts"
import { type Bin, classify, type Shade } from "./scale.ts"
import {
  type Area,
  type Credit,
  credits,
  type Inset as SheetInset,
  load,
  type SheetId,
  type Steps,
} from "./sheet.ts"
import { named, type Spec } from "./spec.ts"

// How a shape is coloured: blank, one of the legend's shades, picked out by a
// highlight, or context only (land shown for location, with no value). A
// colour of `undefined` takes the palette's.
export type Tone =
  | { readonly kind: "blank" }
  | Shade
  | { readonly kind: "accent"; readonly colour: Colour | undefined }
  | { readonly kind: "context" }

export interface Shape {
  readonly country: Country
  readonly name: string
  readonly value: number | undefined
  readonly tone: Tone
  // An SVG path in the sheet's units.
  readonly path: string
  // What a tooltip or screen reader says: "France: 2.1".
  readonly label: string
}

// A subdivision's border, drawn over its country's shape.
export interface Border {
  readonly code: string
  readonly name: string
  readonly path: string
}

// An overseas area in its own box, `width` by `height` units.
export interface Inset {
  readonly name: string
  readonly country: Country
  readonly width: number
  readonly height: number
  readonly tone: Tone
  readonly path: string
  readonly label: string
  readonly borders: ReadonlyArray<Border>
}

export interface Legend {
  readonly bins: ReadonlyArray<Bin>
  readonly better: "higher" | "lower" | undefined
}

// Why the map draws this sheet: the spec named it, or it is the narrowest
// sheet holding every country in the fill.
export type Choice = "Given" | "Derived"

// Everything a renderer needs, with paths built and values classed. It holds
// the spec's colours but no lightness: a renderer paints each tone with its
// palette.
export interface Scene {
  readonly sheet: SheetId | Layout
  readonly choice: Choice
  readonly width: number
  readonly height: number
  // Where each panel sits; a sheet is one panel.
  readonly panels: ReadonlyArray<Frame>
  readonly title: string | undefined
  readonly source: string | undefined
  readonly land: string
  readonly shapes: ReadonlyArray<Shape>
  readonly borders: ReadonlyArray<Border>
  readonly insets: ReadonlyArray<Inset>
  readonly legend: Legend | undefined
  // Countries in the fill too small to draw on this sheet, e.g. Singapore on
  // the world. The rows still list them.
  readonly missing: ReadonlyArray<Country>
  readonly credits: ReadonlyArray<Credit>
  // One row per country in the fill, highest value first: the table every
  // renderer offers beside the map.
  readonly rows: ReadonlyArray<Row>
  // One sentence describing the map for assistive technology.
  readonly description: string
}

export interface Row {
  readonly country: Country
  readonly name: string
  readonly value: number | undefined
  readonly tone: Tone
}

export interface DrawOptions {
  // A BCP 47 locale for country names and numbers. Defaults to "en".
  readonly locale?: string
}

// An outline as an SVG path: each ring's first point, then relative steps.
export const path = (outline: Steps) =>
  outline.map(([x = 0, y = 0, ...steps]) => `M${x} ${y}l${steps.join(" ")}z`).join("")

// How large a dot is drawn, in sheet units, for a country too small to draw
// as a shape: big enough to see and to point at.
const dotRadius = 4

// A dot as an SVG path, so renderers and animations treat it like any shape.
const circle = ([x, y]: readonly [number, number]) =>
  `M${x - dotRadius} ${y}a${dotRadius} ${dotRadius} 0 1 0 ${dotRadius * 2} 0a${dotRadius} ${dotRadius} 0 1 0 ${-dotRadius * 2} 0z`

const blank: Tone = { kind: "blank" }
const context: Tone = { kind: "context" }

// A map before its values: shapes by country, in one space `width` by
// `height` units.
interface Canvas {
  readonly width: number
  readonly height: number
  readonly panels: ReadonlyArray<Frame>
  readonly land: string
  readonly paths: ReadonlyMap<Country, string>
  // The countries the map is about; the rest are context. Every country on a
  // sheet is.
  readonly members: ReadonlySet<Country> | undefined
  readonly borders: ReadonlyArray<Border>
  readonly insets: ReadonlyArray<{
    readonly name: string
    readonly country: Country
    readonly context: boolean
    readonly width: number
    readonly height: number
    readonly path: string
    readonly borders: ReadonlyArray<Border>
  }>
  readonly credits: ReadonlyArray<Credit>
  readonly where: (name: (code: Country) => string) => string
}

const borders = (area: Area): Border => ({
  code: area.code,
  name: area.name,
  path: path(area.outline),
})

const insetOf = (inset: SheetInset): Canvas["insets"][number] => ({
  name: inset.name,
  country: inset.country,
  context: inset.coverage === "Context",
  width: inset.width,
  height: inset.height,
  path: path(inset.outline),
  borders: (inset.areas ?? []).map(borders),
})

const fromSheet = async (id: SheetId): Promise<Canvas> => {
  const sheet = await load(id)
  const paths = new Map<Country, string>()

  for (const { code } of countries) {
    const outline = sheet.outlines[code]
    const dot = sheet.dots?.[code]

    if (outline !== undefined) paths.set(code, path(outline))
    else if (dot !== undefined) paths.set(code, circle(dot))
  }

  return {
    width: sheet.width,
    height: sheet.height,
    panels: [{ x: 0, y: 0, width: sheet.width, height: sheet.height }],
    land: path(sheet.land),
    paths,
    members: undefined,
    borders: (sheet.subdivisions?.areas ?? []).map(borders),
    insets: sheet.insets.map(insetOf),
    credits: credits(sheet),
    where: (name) =>
      sheet.subdivisions !== undefined
        ? name(sheet.subdivisions.country)
        : (regions.find((region) => region.id === id)?.name ?? "the world"),
  }
}

// Layouts with more countries than this are described by their count.
const listed = 6

const fromLayout = async (layout: Layout, codes: ReadonlyArray<Country>): Promise<Canvas> => {
  // Layout code and its country table load only when a map uses a layout.
  const { compose } = await import("./compose.ts")
  const composed = await compose(layout, codes)
  const paths = new Map<Country, string>()

  for (const { code } of countries) {
    const outline = composed.outlines.get(code)
    const dot = composed.dots.get(code)

    if (outline !== undefined) paths.set(code, path(outline))
    else if (dot !== undefined) paths.set(code, circle(dot))
  }

  return {
    width: composed.width,
    height: composed.height,
    panels: composed.panels,
    land: path(composed.land),
    paths,
    members: composed.members,
    borders: [],
    insets: composed.insets.map(insetOf),
    credits: composed.credits,
    where: (name) => {
      const all = [...composed.members]

      return all.length > listed
        ? `${all.length} countries`
        : new Intl.ListFormat("en", { type: "conjunction" }).format(all.map(name))
    },
  }
}

// Resolves a spec into a scene: picks the sheet, or crops sheets into the
// layout's panels, and classes the values. A page downloads only the sheets
// it draws.
export const draw = async (spec: Spec, options: DrawOptions = {}): Promise<Scene> => {
  const locale = options.locale ?? "en"
  const codes = named(spec.fill)
  const id = spec.sheet ?? frames(codes)[0] ?? "world"
  const canvas = typeof id === "object" ? await fromLayout(id, codes) : await fromSheet(id)

  const name = names(locale)
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })

  const { fill } = spec
  const values = new Map<Country, number>(
    fill?.kind === "choropleth"
      ? countries.flatMap(({ code }) => {
          const value = fill.values[code]

          return value === undefined ? [] : [[code, value] as const]
        })
      : [],
  )

  const picked = new Set<Country>(fill?.kind === "highlight" ? fill.countries : [])
  const classed =
    fill?.kind === "choropleth" ? classify([...values.values()], fill.scale) : undefined

  const accent: Tone = {
    kind: "accent",
    colour: fill?.kind === "highlight" ? fill.colour : undefined,
  }

  const toneOf = (code: Country): Tone => {
    if (picked.has(code)) return accent

    const value = values.get(code)

    if (value !== undefined && classed !== undefined) return classed.shadeOf(value)

    return canvas.members === undefined || canvas.members.has(code) ? blank : context
  }

  const labelOf = (code: Country) => {
    const value = values.get(code)

    if (fill?.kind !== "choropleth") return name(code)

    return `${name(code)}: ${value === undefined ? "No data" : numbers.format(value)}`
  }

  const shapes = countries.flatMap(({ code }): ReadonlyArray<Shape> => {
    const drawn = canvas.paths.get(code)

    return drawn === undefined
      ? []
      : [
          {
            country: code,
            name: name(code),
            value: values.get(code),
            tone: toneOf(code),
            path: drawn,
            label: labelOf(code),
          },
        ]
  })

  const insets = canvas.insets.map((inset): Inset => ({
    name: inset.name,
    country: inset.country,
    width: inset.width,
    height: inset.height,
    tone: inset.context ? context : toneOf(inset.country),
    path: inset.path,
    label: inset.context
      ? `${inset.name}, ${name(inset.country)}: location only`
      : `${inset.name}, ${labelOf(inset.country)}`,
    borders: inset.borders,
  }))

  const rows = codes
    .map((code) => ({
      country: code,
      name: name(code),
      value: values.get(code),
      tone: toneOf(code),
    }))
    .toSorted((left, right) => (right.value ?? 0) - (left.value ?? 0))

  const drawn = new Set(shapes.map((shape) => shape.country))
  const legend =
    classed === undefined || fill?.kind !== "choropleth"
      ? undefined
      : { bins: classed.bins, better: fill.better }

  const where = canvas.where(name)
  const what =
    fill === undefined
      ? "countries"
      : fill.kind === "highlight"
        ? `${fill.countries.map(name).join(", ")} highlighted`
        : `${values.size} countries shaded in ${classed?.classes ?? 0} classes${fill.better === undefined ? "" : `, ${fill.better} is better`}`

  return {
    sheet: id,
    choice: spec.sheet === undefined ? "Derived" : "Given",
    width: canvas.width,
    height: canvas.height,
    panels: canvas.panels,
    title: spec.title,
    source: spec.source,
    land: canvas.land,
    shapes,
    borders: canvas.borders,
    insets,
    legend,
    missing: codes.filter((code) => !drawn.has(code)),
    credits: canvas.credits,
    rows,
    description: `${spec.title === undefined ? "" : `${spec.title}. `}Map of ${where}: ${what}.`,
  }
}
