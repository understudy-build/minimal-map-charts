// Writes src/data/globe.gen.ts: where each country lies and how large it is,
// which layouts need to split countries into panels and to draw panels at one
// scale. Reads Natural Earth's 1:50m countries as GeoJSON:
//
//   curl -LO https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson
//   node scripts/globe.ts ne_50m_admin_0_countries.geojson && oxfmt src/data
import { readFileSync, writeFileSync } from "node:fs"

import { around, type Box, contains, gap } from "../src/box.ts"
import { countries } from "../src/countries.ts"

type Point = readonly [number, number]
type Ring = ReadonlyArray<Point>
type Polygon = ReadonlyArray<Ring>

interface Feature {
  readonly properties: { readonly ADM0_A3: string }
  readonly geometry:
    | { readonly type: "Polygon"; readonly coordinates: Polygon }
    | { readonly type: "MultiPolygon"; readonly coordinates: ReadonlyArray<Polygon> }
}

// Natural Earth units the World Bank counts under another code, or as part of
// a country.
const aliases: Readonly<Record<string, string>> = {
  JEY: "CHI",
  GGY: "CHI",
  KOS: "XKX",
  SDS: "SSD",
  SOL: "SOM",
  CYN: "CYP",
  PSX: "PSE",
  ALD: "FIN",
  IOA: "AUS",
  ATC: "AUS",
}

// Parts the region sheets draw in insets, found by a point inside them. They
// count neither in a country's box nor in its area, as a sheet's outline of
// the country leaves them out.
const insets: ReadonlyArray<{ readonly code: string; readonly at: Point }> = [
  { code: "USA", at: [-155.5, 19.6] },
  { code: "FRA", at: [-53, 4] },
  { code: "FRA", at: [-61.55, 16.25] },
  { code: "FRA", at: [-61, 14.65] },
  { code: "FRA", at: [55.5, -21.1] },
  { code: "FRA", at: [45.1, -12.8] },
  { code: "ESP", at: [-15.6, 28] },
  { code: "PRT", at: [-28, 38.6] },
  { code: "PRT", at: [-16.95, 32.75] },
]

// Polygons closer than this frame a country together: Kaliningrad (about
// 260 km away) frames with Russia, Alaska (about 660 km) does not frame with
// the contiguous United States.
const reach = 400

const radius = 6371.0088
const radians = Math.PI / 180

// A ring's area on the sphere in km².
const area = (ring: Ring) =>
  Math.abs(
    ring.reduce((sum, [lon0, lat0], index) => {
      const [lon1, lat1] = ring[(index + 1) % ring.length] ?? [lon0, lat0]

      return (
        sum + (lon1 - lon0) * radians * (2 + Math.sin(lat0 * radians) + Math.sin(lat1 * radians))
      )
    }, 0),
  ) *
  (radius ** 2 / 2)

const polygonArea = ([outer = [], ...holes]: Polygon) =>
  area(outer) - holes.reduce((sum, hole) => sum + area(hole), 0)

// The box around a country's main part: its largest polygon and every polygon
// within `reach` of it, closest first.
const main = (polygons: ReadonlyArray<Polygon>): Box => {
  const boxes = polygons.map((polygon) => around(polygon[0] ?? []))
  const largest = polygons.reduce(
    (best, polygon, index) =>
      polygonArea(polygon) > polygonArea(polygons[best] ?? []) ? index : best,
    0,
  )
  const framed = new Set([largest])
  let grown = true

  while (grown) {
    grown = false

    for (const [index, box] of boxes.entries())
      if (!framed.has(index) && [...framed].some((each) => gap(boxes[each] ?? box, box) < reach)) {
        framed.add(index)
        grown = true
      }
  }

  return around([...framed].flatMap((index) => polygons[index]?.[0] ?? []))
}

const input = process.argv[2]

if (input === undefined) throw new Error("Usage: node scripts/globe.ts <countries.geojson>")

// Natural Earth's GeoJSON, checked only as far as this script reads it.
const isFeature = (value: unknown): value is Feature =>
  typeof value === "object" &&
  value !== null &&
  "properties" in value &&
  "geometry" in value &&
  typeof value.geometry === "object" &&
  value.geometry !== null &&
  "type" in value.geometry &&
  (value.geometry.type === "Polygon" || value.geometry.type === "MultiPolygon")

const parsed: unknown = JSON.parse(readFileSync(input, "utf8"))
const features =
  typeof parsed === "object" &&
  parsed !== null &&
  "features" in parsed &&
  Array.isArray(parsed.features)
    ? parsed.features.filter(isFeature)
    : []

const byCode = Map.groupBy(
  features.flatMap((feature) => {
    const { geometry } = feature
    const code = aliases[feature.properties.ADM0_A3] ?? feature.properties.ADM0_A3

    return (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates).map(
      (polygon) => ({ code, polygon }),
    )
  }),
  ({ code }) => code,
)

const tenth = (value: number) => Math.round(value * 10) / 10

const entries = countries.flatMap(({ code }) => {
  const polygons = (byCode.get(code) ?? [])
    .map(({ polygon }) => polygon)
    .filter(
      (polygon) =>
        !insets.some(
          (inset) => inset.code === code && contains(around(polygon[0] ?? []), inset.at, 0.3),
        ),
    )

  if (polygons.length === 0) return []

  const [west, south, east, north] = main(polygons)
  const km2 = polygons.reduce((sum, polygon) => sum + polygonArea(polygon), 0)

  return [
    `${code}: { box: [${[west, south, east, north].map(tenth).join(", ")}], area: ${Math.round(km2)} },`,
  ]
})

writeFileSync(
  new URL("../src/data/globe.gen.ts", import.meta.url).pathname,
  [
    "// Generated by scripts/globe.ts from Natural Earth 1:50m countries v5.1.2",
    "// (public domain, https://www.naturalearthdata.com). Do not edit.",
    'import type { Box } from "../box.ts"',
    'import type { Country } from "../countries.ts"',
    "",
    "// Each country's main part as a box in degrees, and its area in km², both",
    "// without the parts a sheet draws in insets.",
    "export const globe: Readonly<",
    "  Partial<Record<Country, { readonly box: Box; readonly area: number }>>",
    `> = { ${entries.join("\n")} }`,
    "",
  ].join("\n"),
)

console.info(`Wrote ${entries.length} countries`)
