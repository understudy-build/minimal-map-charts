import { type Area, isArea } from "./areas.ts"
import type { Colour } from "./colour.ts"
import type { Frame } from "./compose.ts"
import { type Country, countries, names } from "./countries.ts"
import { projections } from "./data/sheets.gen.ts"
import { frames, isSheet } from "./frame.ts"
import type { Layout } from "./layout.ts"
import { credit as gazetteerCredit, radius, resolve, type Resolved, sizes } from "./points.ts"
import { type Degrees, inInsets, type Located, within } from "./project.ts"
import { regions } from "./regions.ts"
import { type Bin, classify, type Shade } from "./scale.ts"
import {
  type Area as SheetArea,
  type Credit,
  credits,
  type Inset as SheetInset,
  load,
  type SheetId,
  type Steps,
} from "./sheet.ts"
import {
  type Fill,
  type Issue,
  type Named,
  named,
  type Points,
  type Spec,
  type Value,
} from "./spec.ts"

// How a shape is coloured: blank, one of the legend's shades, picked out by a
// highlight, or context only (land shown for location, with no value). A
// colour of `undefined` takes the palette's.
export type Tone =
  | { readonly kind: "blank" }
  | Shade
  | { readonly kind: "accent"; readonly colour: Colour | undefined }
  | { readonly kind: "context" }
  // A point's mark, in the spec's colour or the palette's point colour.
  | { readonly kind: "point"; readonly colour: Colour | undefined }

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

// An area the fill names, drawn over its country's shape and under the
// borders.
export interface Patch {
  readonly area: Area
  readonly name: string
  readonly value: number | undefined
  readonly tone: Tone
  readonly path: string
  readonly label: string
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
  readonly patches: ReadonlyArray<Patch>
  readonly borders: ReadonlyArray<Border>
  // The points the inset holds, in its units.
  readonly marks: ReadonlyArray<Mark>
}

// A site drawn once, as a circle centred at `x`, `y`. Its radius is in map
// units on the map and in insets alike, so equal values draw equal circles:
// a renderer that draws an inset `w` map units wide scales it by
// `inset.width / w`.
export interface Mark {
  readonly name: string
  readonly value: number | undefined
  readonly x: number
  readonly y: number
  readonly radius: number
  // What a tooltip or screen reader says: "Paris: 420".
  readonly label: string
}

// A site as the table beside the map lists it, where it was found.
export interface Placed {
  readonly name: string
  readonly value: number | undefined
  readonly lat: number
  readonly lon: number
  // The country and area of a site named by its place.
  readonly country: Country | undefined
  readonly area: Area | undefined
}

// The points as drawn: how their marks look, the legend's circles, and one
// row per site.
export interface Layer {
  readonly kind: Points["kind"]
  readonly tone: Tone
  readonly label: string | undefined
  // A bubble legend's circles, largest first, each with its radius in map
  // units; none for dots.
  readonly sizes: ReadonlyArray<{ readonly value: number; readonly radius: number }>
  // Largest value first.
  readonly sites: ReadonlyArray<Placed>
  // Natural Earth's, when a site was found by its place.
  readonly credit: Credit | undefined
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
  readonly patches: ReadonlyArray<Patch>
  readonly borders: ReadonlyArray<Border>
  readonly insets: ReadonlyArray<Inset>
  readonly legend: Legend | undefined
  // The points over the map, largest first, so smaller ones draw on top.
  readonly marks: ReadonlyArray<Mark>
  readonly points: Layer | undefined
  // Countries in the fill too small to draw on this sheet, e.g. Singapore on
  // the world. The rows still list them.
  readonly missing: ReadonlyArray<Country>
  readonly credits: ReadonlyArray<Credit>
  // One row per country or area in the fill, highest value first: the table
  // every renderer offers beside the map.
  readonly rows: ReadonlyArray<Row>
  // One sentence describing the map for assistive technology.
  readonly description: string
}

export interface Row {
  readonly country: Country
  // The area the row is about, when the fill names areas of `country`.
  readonly area: Area | undefined
  readonly name: string
  readonly value: number | undefined
  readonly tone: Tone
}

// A scene, or why the spec cannot be drawn: `parse` checks an area's code
// without its sheet, and only the sheet knows which codes it draws.
export type Drawn =
  | { readonly ok: true; readonly scene: Scene }
  | { readonly ok: false; readonly issues: ReadonlyArray<Issue> }

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

const tenth = (value: number) => Math.round(value * 10) / 10

// Larger marks draw first, so smaller ones sit on top.
const largestFirst = (left: Mark, right: Mark) => right.radius - left.radius

const count = (n: number) => `${n} ${n === 1 ? "point" : "points"}`

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
  readonly locate: (point: Degrees) => Located
}

const borders = (area: SheetArea): Border => ({
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
    locate: (point) => {
      const held = inInsets(sheet.insets, point)
      const spot = held.away ? undefined : within(sheet.projection, point, sheet)

      return { map: spot === undefined ? [] : [spot], insets: held.insets }
    },
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
    locate: composed.locate,
    where: (name) => {
      const all = [...composed.members]

      return all.length > listed
        ? `${all.length} countries`
        : new Intl.ListFormat("en", { type: "conjunction" }).format(all.map(name))
    },
  }
}

// Each area the fill names that the sheet does not draw under that code.
const undrawn = (fill: Fill | undefined, drawn: ReadonlySet<string>): ReadonlyArray<Issue> => {
  const given =
    fill === undefined
      ? []
      : fill.kind === "choropleth"
        ? fill.values.flatMap((each, index) =>
            "area" in each ? [{ area: each.area, at: ["fill", "values", index, "area"] }] : [],
          )
        : "areas" in fill
          ? fill.areas.map((area, index) => ({ area, at: ["fill", "areas", index] }))
          : []

  return given.flatMap(({ area, at }): ReadonlyArray<Issue> =>
    drawn.has(area) ? [] : [{ kind: "NoArea", path: at, area }],
  )
}

// The countries a map is about: those the fill names, or the one whose areas
// it names, and those of the places its points name.
const subjects = (target: Named, points: Points | undefined): ReadonlyArray<Country> => [
  ...new Set([
    ...(target.kind === "countries" ? target.codes : [target.country]),
    ...(points?.sites ?? []).flatMap((each) => ("place" in each ? [each.country] : [])),
  ]),
]

type Framing = keyof typeof projections

// The prebuilt maps that can frame points without a country: the regions,
// narrowest first, then the world.
const framing: ReadonlyArray<Framing> = [...regions.map((region) => region.id), "world"]

const isFraming = (id: SheetId): id is Framing => Object.hasOwn(projections, id)

// Whether a prebuilt map frames every point, on the map or in an inset.
const holds = (id: SheetId, points: ReadonlyArray<Degrees>) =>
  isFraming(id) &&
  points.every(
    (point) =>
      within(projections[id].map, point, projections[id]) !== undefined ||
      inInsets(projections[id].insets, point).insets.length > 0,
  )

// The sheet or layout a spec draws, without loading anything: the spec's
// own, else the areas' country's map, else the narrowest region holding
// every country in the fill and every point at coordinates, else the world.
// A point at a place counts as its country: where in it is known only once
// its country's places load.
export const sheetOf = (spec: Spec): SheetId | Layout => {
  const target = named(spec.fill)

  if (spec.sheet !== undefined) return spec.sheet
  if (target.kind === "areas" && isSheet(target.country)) return target.country

  const codes = subjects(target, spec.points)
  const located = (spec.points?.sites ?? []).flatMap((each): ReadonlyArray<Degrees> =>
    "place" in each ? [] : [[each.lon, each.lat]],
  )
  const candidates = codes.length === 0 ? framing : frames(codes)

  return candidates.find((id) => holds(id, located)) ?? "world"
}

// Resolves a spec into a scene: picks the sheet, or crops sheets into the
// layout's panels, and classes the values. A page downloads only the sheets
// it draws. It refuses an area the sheet does not draw rather than leave it
// blank.
export const draw = async (spec: Spec, options: DrawOptions = {}): Promise<Drawn> => {
  const locale = options.locale ?? "en"
  const target = named(spec.fill)
  const codes = subjects(target, spec.points)
  const id = sheetOf(spec)
  // A country's places load beside the sheet, and only when a site names one.
  const [canvas, found] = await Promise.all([
    typeof id === "object" ? fromLayout(id, codes) : fromSheet(id),
    resolve(spec.points),
  ])

  // Each area's name as its sheet gives it, on the map or in an inset.
  const areaNames = new Map(
    [...canvas.borders, ...canvas.insets.flatMap((inset) => inset.borders)].map((border) => [
      border.code,
      border.name,
    ]),
  )
  const located = found.sites.map((site) => ({ site, where: canvas.locate(site.at) }))
  const everywhere = found.sites.map((site) => site.at)
  const outside = located.flatMap(({ site, where }): ReadonlyArray<Issue> =>
    where.map.length > 0 || where.insets.length > 0
      ? []
      : [
          {
            kind: "Outside",
            path: site.path,
            site: site.name,
            sheet: id,
            sheets: framing.filter((each) => holds(each, everywhere)),
          },
        ],
  )
  const issues = [...undrawn(spec.fill, new Set(areaNames.keys())), ...found.issues, ...outside]

  if (issues.length > 0) return { ok: false, issues }

  const name = names(locale)
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })

  const { points } = spec
  const peak = Math.max(0, ...found.sites.map((site) => site.value ?? 0))
  const sized = radius(points?.kind ?? "dot", { width: canvas.width, peak })
  const markOf = (site: Resolved, [x, y]: readonly [number, number]): Mark => ({
    name: site.name,
    value: site.value,
    x: tenth(x),
    y: tenth(y),
    radius: tenth(sized(site.value ?? 0)),
    label: site.value === undefined ? site.name : `${site.name}: ${numbers.format(site.value)}`,
  })
  const marks = located
    .flatMap(({ site, where }) => where.map.map((at) => markOf(site, at)))
    .toSorted(largestFirst)
  const insetMarks = (index: number) =>
    located
      .flatMap(({ site, where }) =>
        where.insets.flatMap((each) => (each.index === index ? [markOf(site, each.at)] : [])),
      )
      .toSorted(largestFirst)
  const layer: Layer | undefined =
    points === undefined
      ? undefined
      : {
          kind: points.kind,
          tone: { kind: "point", colour: points.colour },
          label: points.label,
          sizes:
            points.kind === "bubble"
              ? sizes(peak).map((value) => ({ value, radius: tenth(sized(value)) }))
              : [],
          sites: found.sites
            .map(({ name: site, value, at: [lon, lat], country, area }) => ({
              name: site,
              value,
              lat,
              lon,
              country,
              area,
            }))
            .toSorted((left, right) => (right.value ?? 0) - (left.value ?? 0)),
          credit: points.sites.some((each) => "place" in each) ? gazetteerCredit : undefined,
        }

  const { fill } = spec
  const given: ReadonlyArray<Value> = fill?.kind === "choropleth" ? fill.values : []
  const values = new Map<Country | Area, number>(
    given.map((each) => ["area" in each ? each.area : each.country, each.value]),
  )

  const picked = new Set<Country | Area>(
    fill?.kind === "highlight" ? ("areas" in fill ? fill.areas : fill.countries) : [],
  )
  const classed =
    fill?.kind === "choropleth" ? classify([...values.values()], fill.scale) : undefined

  const accent: Tone = {
    kind: "accent",
    colour: fill?.kind === "highlight" ? fill.colour : undefined,
  }

  const toneOf = (code: Country | Area): Tone => {
    if (picked.has(code)) return accent

    const value = values.get(code)

    if (value !== undefined && classed !== undefined) return classed.shadeOf(value)

    return canvas.members === undefined || isArea(code) || canvas.members.has(code)
      ? blank
      : context
  }

  const labelled = (text: string, value: number | undefined) =>
    fill?.kind === "choropleth"
      ? `${text}: ${value === undefined ? "No data" : numbers.format(value)}`
      : text

  // In a fill of areas their country has no value of its own: its shape
  // shows blank where an area has none, and is only context once its areas
  // cover it.
  const covered = new Set<string>(target.kind === "areas" ? target.codes : [])
  const under = (parts: ReadonlyArray<Border>): Tone =>
    parts.every((part) => covered.has(part.code)) ? context : blank
  const owned = (code: Country) => target.kind === "areas" && code === target.country

  const labelOf = (code: Country) =>
    owned(code) ? name(code) : labelled(name(code), values.get(code))

  const patch = (border: Border): ReadonlyArray<Patch> => {
    const area =
      target.kind === "areas" ? target.codes.find((code) => code === border.code) : undefined

    if (area === undefined) return []

    const value = values.get(area)

    return [
      {
        area,
        name: border.name,
        value,
        tone: toneOf(area),
        path: border.path,
        label: labelled(border.name, value),
      },
    ]
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
            tone: owned(code) ? under(canvas.borders) : toneOf(code),
            path: drawn,
            label: labelOf(code),
          },
        ]
  })

  const insets = canvas.insets.map((inset, index): Inset => ({
    name: inset.name,
    country: inset.country,
    width: inset.width,
    height: inset.height,
    tone: inset.context
      ? context
      : owned(inset.country)
        ? under(inset.borders)
        : toneOf(inset.country),
    path: inset.path,
    label: inset.context
      ? `${inset.name}, ${name(inset.country)}: location only`
      : `${inset.name}, ${labelOf(inset.country)}`,
    patches: inset.borders.flatMap(patch),
    borders: inset.borders,
    marks: insetMarks(index),
  }))

  const rows = (
    target.kind === "countries"
      ? target.codes.map((code): Row => ({
          country: code,
          area: undefined,
          name: name(code),
          value: values.get(code),
          tone: toneOf(code),
        }))
      : target.codes.map((area): Row => ({
          country: target.country,
          area,
          name: areaNames.get(area) ?? area,
          value: values.get(area),
          tone: toneOf(area),
        }))
  ).toSorted((left, right) => (right.value ?? 0) - (left.value ?? 0))

  const drawn = new Set(shapes.map((shape) => shape.country))
  const legend =
    classed === undefined || fill?.kind !== "choropleth"
      ? undefined
      : { bins: classed.bins, better: fill.better }

  const where = canvas.where(name)
  const [top] = layer?.sites ?? []
  const pointed =
    layer === undefined
      ? undefined
      : layer.kind === "dot"
        ? `${count(layer.sites.length)}${layer.label === undefined ? "" : ` (${layer.label})`}`
        : `${count(layer.sites.length)} sized by ${layer.label ?? "value"}${top === undefined ? "" : `, largest ${top.name} (${numbers.format(top.value ?? 0)})`}`
  const shaded =
    fill === undefined
      ? pointed === undefined
        ? "countries"
        : undefined
      : fill.kind === "highlight"
        ? `${rows.map((row) => row.name).join(", ")} highlighted`
        : `${values.size} ${target.kind} shaded in ${classed?.classes ?? 0} classes${fill.better === undefined ? "" : `, ${fill.better} is better`}`
  const what = [shaded, pointed].filter((each) => each !== undefined).join("; ")

  const scene: Scene = {
    sheet: id,
    choice: spec.sheet === undefined ? "Derived" : "Given",
    width: canvas.width,
    height: canvas.height,
    panels: canvas.panels,
    title: spec.title,
    source: spec.source,
    land: canvas.land,
    shapes,
    patches: canvas.borders.flatMap(patch),
    borders: canvas.borders,
    insets,
    legend,
    marks,
    points: layer,
    missing: target.kind === "countries" ? target.codes.filter((code) => !drawn.has(code)) : [],
    credits: canvas.credits,
    rows,
    description: `${spec.title === undefined ? "" : `${spec.title}. `}Map of ${where}: ${what}.`,
  }

  return { ok: true, scene }
}
