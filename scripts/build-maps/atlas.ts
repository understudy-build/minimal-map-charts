// Natural Earth's country outlines from world-atlas, as the world and region
// sheets draw them: each with its World Bank code, and disputed land given
// to who borders.ts says holds it. scripts/build-maps/index.ts projects them;
// scripts/build-maps/audit.ts compares them with the national sheets.
import { readFileSync } from "node:fs"

import { Schema } from "effect"
import type { FeatureCollection, GeoJsonProperties, MultiPolygon } from "geojson"
import { feature, mergeArcs } from "topojson-client"
import { topology } from "topojson-server"
import type {
  GeometryCollection,
  GeometryObject,
  MultiPolygon as Arcs,
  Polygon as Arc,
  Topology,
} from "topojson-specification"

import { type Country, countries } from "../../src/countries.ts"
import { type Outline, pairs, settle } from "./borders.ts"

// A JSON file shipped in an npm package, such as world-atlas.
const packaged = (path: string) => readFileSync(new URL(import.meta.resolve(path)), "utf8")

// A country's outline, or land of no country, with a null code.
interface Place {
  readonly name: string
  readonly code: Country | null
}

export type Countries = Topology<{ countries: GeometryCollection<Place> }>

// How detailed Natural Earth's outlines are: 1:110m for the world, 1:50m for
// most regions, 1:10m for the smallest.
export type Detail = "110m" | "50m" | "10m"

export const isArea = <P extends GeoJsonProperties>(
  geometry: GeometryObject<P>,
): geometry is Arc<P> | Arcs<P> => geometry.type === "Polygon" || geometry.type === "MultiPolygon"

// [alpha-2, alpha-3, numeric, subdivision prefix] for every ISO 3166-1 country.
const codes = Schema.decodeUnknownSync(Schema.Array(Schema.Array(Schema.String)))(
  JSON.parse(packaged("i18n-iso-countries/codes.json")),
)

const alpha3 = new Map(codes.map(([, three, numeric]) => [numeric, three]))
const known = new Set<string>(countries.map((country) => country.code))
const isCountry = (code: string | undefined): code is Country =>
  code !== undefined && known.has(code)

// The World Bank's code for a Natural Earth country, if it publishes data for
// it. Kosovo has no ISO code, so the World Bank calls it XKX; Jersey and
// Guernsey are its Channel Islands, CHI.
const codeOf = (name: string, id: string | number | undefined) => {
  const code =
    name === "Kosovo"
      ? "XKX"
      : name === "Jersey" || name === "Guernsey"
        ? "CHI"
        : alpha3.get(`${id}`)

  return isCountry(code) ? code : null
}

// world-atlas's outlines at a detail, settled.
const outlinesOf = (detail: Detail): Array<Outline> => {
  const source: Topology<{ countries: GeometryCollection<{ name: string }> }> = JSON.parse(
    packaged(`world-atlas/countries-${detail}.json`),
  )

  return settle(
    feature(source, source.objects.countries).features.flatMap(({ properties, id, geometry }) =>
      geometry?.type === "Polygon" || geometry?.type === "MultiPolygon"
        ? [
            {
              name: properties.name,
              code: codeOf(properties.name, id),
              shapes:
                geometry.type === "Polygon"
                  ? [pairs(geometry.coordinates)]
                  : geometry.coordinates.map(pairs),
            },
          ]
        : [],
    ),
  )
}

// The outlines as one topology, so neighbours share their borders: a
// country's outlines, or the pieces of one area of no country, merge into
// one, without borders between them.
const topologyOf = (outlines: ReadonlyArray<Outline>): Countries => {
  const collected: FeatureCollection<MultiPolygon> = {
    type: "FeatureCollection",
    features: outlines.map((outline, index) => ({
      type: "Feature",
      id: index,
      properties: {},
      geometry: { type: "MultiPolygon", coordinates: [...outline.shapes] },
    })),
  }

  const shared = topology({ countries: collected })

  const collection = shared.objects["countries"]

  if (collection?.type !== "GeometryCollection") throw new Error("Expected a collection")

  const areas = collection.geometries.filter(isArea)
  const groups = Map.groupBy(outlines.entries(), ([, outline]) => outline.code ?? outline.name)

  const geometries = [...groups.values()].flatMap((members) => {
    const [first] = members

    if (first === undefined) return []

    const [, { name, code }] = first
    const parts = members.flatMap(([index]) => areas.filter((area) => area.id === index))
    const [only] = parts

    if (only === undefined) return []

    return [
      parts.length === 1
        ? { ...only, id: undefined, properties: { name, code } }
        : {
            ...mergeArcs(shared, [
              {
                type: "MultiPolygon",
                arcs: parts.flatMap((part) => (part.type === "Polygon" ? [part.arcs] : part.arcs)),
              },
            ]),
            properties: { name, code },
          },
    ]
  })

  return { ...shared, objects: { countries: { type: "GeometryCollection", geometries } } }
}

// The outlines at 1:50m, as most region sheets draw them, which national
// sheets are trimmed to and audited against.
export const outlines = outlinesOf("50m")

export const atlas: Record<Detail, Countries> = {
  "110m": topologyOf(outlinesOf("110m")),
  "50m": topologyOf(outlines),
  "10m": topologyOf(outlinesOf("10m")),
}
