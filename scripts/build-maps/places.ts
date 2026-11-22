// Writes src/data/places/: Natural Earth's 1:10m populated places, one module
// per country, so a spec can name a city instead of giving its coordinates.
// Each place belongs to the country whose outline holds it on the maps, by
// the same disputed-land rule the sheets draw, and to the area of its
// country's own map that holds it, so two places of one name in a country
// can be told apart by their ISO 3166-2 code.
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"

import { geoBounds, geoContains, geoDistance, type GeoPermissibleObjects } from "d3-geo"
import { Schema } from "effect"
import type { MultiPolygon } from "geojson"
import { feature } from "topojson-client"

import { type Country, countries } from "../../src/countries.ts"
import { normal } from "../../src/places.ts"
import { snapshot } from "./archive.ts"
import { atlas } from "./atlas.ts"

// Natural Earth's file as published, gzipped as an asset of the sources
// release, which scripts/build-maps/archive.ts restores with the other
// snapshots. The digest is of the published file, so a re-upload that
// changes it fails the build.
const source = {
  url: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_populated_places.geojson",
  sha256: "9b8e3de09048ef00dfc70357dbb9fa324493f214b5e0ae4daf1aa79a8d10116b",
}

export const placesFile = "ne_10m_populated_places.geojson.gz"

// The restored snapshot, checked against the file Natural Earth published.
const read = (): string => {
  const text = gunzipSync(readFileSync(snapshot(placesFile))).toString("utf8")
  const digest = createHash("sha256").update(text).digest("hex")

  if (digest !== source.sha256)
    throw new Error(`${placesFile} does not match ${source.url} at its pinned digest`)

  return text
}

const Places = Schema.Struct({
  features: Schema.Array(
    Schema.Struct({
      properties: Schema.Struct({
        NAME: Schema.NonEmptyString,
        NAME_EN: Schema.NullOr(Schema.String),
        NAMEASCII: Schema.NullOr(Schema.String),
        NAMEALT: Schema.NullOr(Schema.String),
        ADM0_A3: Schema.String,
        LONGITUDE: Schema.Finite,
        LATITUDE: Schema.Finite,
        POP_MAX: Schema.Finite,
      }),
    }),
  ),
})

// Longitude and latitude, as d3-geo takes them.
type Point = [number, number]

interface Outline<G extends GeoPermissibleObjects = GeoPermissibleObjects> {
  readonly code: string | null
  readonly geometry: G
  // West, south, east, north; west above east across 180°.
  readonly box: readonly [number, number, number, number]
}

const outlineOf = <G extends GeoPermissibleObjects>(
  code: string | null,
  geometry: G,
): Outline<G> => {
  const [[west, south], [east, north]] = geoBounds(geometry)

  return { code, geometry, box: [west, south, east, north] }
}

const boxed = ({ box: [west, south, east, north] }: Outline, [lon, lat]: Point) =>
  lat >= south &&
  lat <= north &&
  (west <= east ? lon >= west && lon <= east : lon >= west || lon <= east)

// The first outline that holds the point, else the one with a vertex nearest
// it, for a coastal place that falls just outside its simplified coast.
const holder = <A extends Outline>(outlines: ReadonlyArray<A>, point: Point): A | undefined =>
  outlines.find((each) => boxed(each, point) && geoContains(each.geometry, point))

const vertices = (geometry: MultiPolygon): ReadonlyArray<Point> =>
  geometry.coordinates.flat(2).map(([lon = 0, lat = 0]) => [lon, lat])

const nearest = <A extends { readonly geometry: MultiPolygon }>(
  candidates: ReadonlyArray<A>,
  point: Point,
): A | undefined =>
  candidates
    .map((each) => ({
      each,
      distance: vertices(each.geometry).reduce(
        (least, vertex) => Math.min(least, geoDistance(vertex, point)),
        Infinity,
      ),
    }))
    .toSorted((left, right) => left.distance - right.distance)[0]?.each

// An area of a country's own map, in degrees, by its published code.
export interface Division {
  readonly code: string
  readonly geometry: MultiPolygon
}

const isoForm = /^[A-Z]{2}-[A-Z0-9]{1,3}$/

const known = new Set<string>(countries.map((country) => country.code))
const isCountry = (code: string | null | undefined): code is Country =>
  code !== null && code !== undefined && known.has(code)

// Every name a model may use for a place, the place's own first.
const namesOf = ({
  NAME,
  NAME_EN,
  NAMEASCII,
  NAMEALT,
}: (typeof Places.Type)["features"][number]["properties"]) => {
  const all = [NAME, NAME_EN ?? "", NAMEASCII ?? "", ...(NAMEALT ?? "").split(/[|,]/)]
    .map((each) => each.trim())
    .filter((each) => each !== "")
  const seen = new Set<string>()

  return all.filter((each) => {
    const key = normal(each)

    if (key === "" || seen.has(key)) return false

    seen.add(key)

    return true
  })
}

// Former English names models still write that Natural Earth leaves out, by
// country and the name it gives the place.
const former: Partial<Record<Country, Readonly<Record<string, ReadonlyArray<string>>>>> = {
  IND: { Bengaluru: ["Bangalore"], Mumbai: ["Bombay"], Chennai: ["Madras"], Kolkata: ["Calcutta"] },
  VNM: { "Ho Chi Minh City": ["Saigon"] },
  CHN: { Beijing: ["Peking"], Guangzhou: ["Canton"] },
  KAZ: { Almaty: ["Alma-Ata"] },
}

const thousandth = (value: number) => Math.round(value * 1000) / 1000

const folder = new URL("../../src/data/places/", import.meta.url)

// Writes each country's places and the registry that imports them.
export const writePlaces = async (divisions: ReadonlyMap<Country, ReadonlyArray<Division>>) => {
  const { features } = Schema.decodeUnknownSync(Places)(JSON.parse(read()))
  const source10m = atlas["10m"]
  const outlines = feature(source10m, source10m.objects.countries).features.map((each) =>
    outlineOf(each.properties.code, each),
  )
  const boxes = new Map(
    [...divisions].map(([country, list]) => [
      country,
      list
        .filter((each) => isoForm.test(each.code))
        .map((each) => outlineOf(each.code, each.geometry)),
    ]),
  )
  const dropped = { noCountry: 0, repeated: 0 }
  const byCountry = new Map<
    Country,
    Array<{
      readonly names: ReadonlyArray<string>
      readonly area: string | null
      readonly point: Point
      readonly population: number
    }>
  >()

  for (const { properties } of features) {
    const point: Point = [properties.LONGITUDE, properties.LATITUDE]
    const held = holder(outlines, point)
    // Land of no country, such as Taiwan, has no code a spec can name.
    const country = held === undefined ? properties.ADM0_A3 : held.code

    if (!isCountry(country)) {
      dropped.noCountry += 1
      continue
    }

    const areas = boxes.get(country) ?? []
    const area =
      areas.length === 0 ? null : ((holder(areas, point) ?? nearest(areas, point))?.code ?? null)

    const list = byCountry.get(country) ?? []

    const names = namesOf(properties)

    list.push({
      names: [...names, ...(former[country]?.[properties.NAME] ?? [])],
      area,
      point,
      population: properties.POP_MAX,
    })
    byCountry.set(country, list)
  }

  for (const { code } of countries)
    for (const name of Object.keys(former[code] ?? {}))
      if (!byCountry.get(code)?.some((place) => place.names[0] === name))
        throw new Error(`former names a place Natural Earth does not list: ${name}, ${code}`)

  rmSync(folder, { recursive: true, force: true })
  mkdirSync(folder, { recursive: true })

  const written: Array<Country> = []
  let total = 0

  for (const { code } of countries) {
    const list = byCountry.get(code)

    if (list === undefined) continue

    // Two places of one name in one area cannot be told apart: the larger
    // keeps the name.
    const kept = list
      .toSorted((left, right) => right.population - left.population)
      .filter((place, index, all) => {
        const key = `${normal(place.names[0] ?? "")} ${place.area ?? ""}`
        const first = all.findIndex(
          (other) => `${normal(other.names[0] ?? "")} ${other.area ?? ""}` === key,
        )

        if (first !== index) dropped.repeated += 1

        return first === index
      })
      .toSorted((left, right) => (left.names[0] ?? "").localeCompare(right.names[0] ?? "", "en"))

    total += kept.length
    written.push(code)
    writeFileSync(
      new URL(`${code}.gen.ts`, folder),
      `// Generated by scripts/build-maps/places.ts from Natural Earth 1:10m populated
// places v5.1.2 (public domain, https://www.naturalearthdata.com). Do not edit.
import type { Gazetteer } from "../../places.ts"

// Each place: its name, the area of the country's own map that holds it,
// its longitude and latitude, then the other names it goes by.
const places: Gazetteer = ${JSON.stringify(
        kept.map(({ names: [name = "", ...others], area, point: [lon, lat] }) =>
          [name, area, thousandth(lon), thousandth(lat)].concat(others),
        ),
      )}

export default places
`,
    )
  }

  writeFileSync(
    new URL("../places.gen.ts", folder),
    `// Generated by scripts/build-maps/places.ts. Do not edit.
import type { Country } from "../countries.ts"
import type { Gazetteer } from "../places.ts"

// Each country's places, imported the first time a spec names one of them.
export const gazetteer: Partial<Record<Country, () => Promise<{ readonly default: Gazetteer }>>> = {
${written.map((code) => `  ${code}: () => import("./places/${code}.gen.ts"),`).join("\n")}
}
`,
  )

  console.info(
    `Places: ${total} in ${written.length} countries; ${dropped.noCountry} on land of no country and ${dropped.repeated} repeating a name in one area left out`,
  )
}
