import { type Country, countries, names } from "./countries.ts"
import { frames } from "./frame.ts"
import { regions } from "./regions.ts"
import { type Bin, classify } from "./scale.ts"
import { type Credit, credits, load, type SheetId, type Steps } from "./sheet.ts"
import { named, type Spec } from "./spec.ts"

// How a shape is coloured: blank, one of the legend's shades, picked out by a
// highlight, or context only (land shown for location, with no value).
export type Tone =
  | { readonly kind: "blank" }
  | { readonly kind: "shade"; readonly shade: number }
  | { readonly kind: "accent" }
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
  readonly classes: number
  readonly bins: ReadonlyArray<Bin>
  readonly better: "higher" | "lower" | undefined
}

// Why the map draws this sheet: the spec named it, or it is the narrowest
// sheet holding every country in the fill.
export type Choice = "Given" | "Derived"

// Everything a renderer needs, with paths built and values classed. It holds
// no colours: a renderer maps each tone to its palette.
export interface Scene {
  readonly sheet: SheetId
  readonly choice: Choice
  readonly width: number
  readonly height: number
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

// Resolves a spec into a scene: picks the sheet, loads it and classes the
// values. A page downloads only the sheet it draws.
export const draw = async (spec: Spec, options: DrawOptions = {}): Promise<Scene> => {
  const locale = options.locale ?? "en"
  const codes = named(spec.fill)
  const derived = frames(codes)[0] ?? "world"
  const id = spec.sheet ?? derived
  const sheet = await load(id)

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

  const toneOf = (code: Country): Tone => {
    if (picked.has(code)) return { kind: "accent" }

    const value = values.get(code)

    return value === undefined || classed === undefined
      ? blank
      : { kind: "shade", shade: classed.shadeOf(value) }
  }

  const labelOf = (code: Country) => {
    const value = values.get(code)

    if (fill?.kind !== "choropleth") return name(code)

    return `${name(code)}: ${value === undefined ? "No data" : numbers.format(value)}`
  }

  const shapes = countries.flatMap(({ code }): ReadonlyArray<Shape> => {
    const outline = sheet.outlines[code]
    const dot = sheet.dots?.[code]
    const drawn =
      outline === undefined ? (dot === undefined ? undefined : circle(dot)) : path(outline)

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

  const borders = (sheet.subdivisions?.areas ?? []).map(({ code, name: area, outline }) => ({
    code,
    name: area,
    path: path(outline),
  }))

  const insets = sheet.insets.map((inset): Inset => {
    const context = inset.coverage === "Context"

    return {
      name: inset.name,
      country: inset.country,
      width: inset.width,
      height: inset.height,
      tone: context ? { kind: "context" } : toneOf(inset.country),
      path: path(inset.outline),
      label: context
        ? `${inset.name}, ${name(inset.country)}: location only`
        : `${inset.name}, ${labelOf(inset.country)}`,
      borders: (inset.areas ?? []).map(({ code, name: area, outline }) => ({
        code,
        name: area,
        path: path(outline),
      })),
    }
  })

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
      : { classes: classed.classes, bins: classed.bins, better: fill.better }

  const where =
    sheet.subdivisions !== undefined
      ? name(sheet.subdivisions.country)
      : (regions.find((region) => region.id === id)?.name ?? "the world")
  const what =
    fill === undefined
      ? "countries"
      : fill.kind === "highlight"
        ? `${fill.countries.map(name).join(", ")} highlighted`
        : `${values.size} countries shaded in ${classed?.classes ?? 0} classes${fill.better === undefined ? "" : `, ${fill.better} is better`}`

  return {
    sheet: id,
    choice: spec.sheet === undefined ? "Derived" : "Given",
    width: sheet.width,
    height: sheet.height,
    title: spec.title,
    source: spec.source,
    land: path(sheet.land),
    shapes,
    borders,
    insets,
    legend,
    missing: codes.filter((code) => !drawn.has(code)),
    credits: credits(sheet),
    rows,
    description: `${spec.title === undefined ? "" : `${spec.title}. `}Map of ${where}: ${what}.`,
  }
}
