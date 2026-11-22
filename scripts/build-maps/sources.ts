// Reads each national map's subdivisions from its source snapshot, as GeoJSON
// features with a code and a name, in WGS84 longitude and latitude.
// scripts/build-maps/archive.ts restores the snapshots.
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"

import { Match, Schema } from "effect"
import type { MultiPolygon, Polygon } from "geojson"
import { difference, intersection } from "polyclip-ts"

import { type Country as Code, countries } from "../../src/countries.ts"
import { snapshot } from "./archive.ts"
import { outlines } from "./atlas.ts"
import { pairs, trim, trims } from "./borders.ts"
import { geometry } from "./geojson.ts"
import { counties, councils, type Nation } from "./nations.ts"

const Codes = Schema.Literals

const Country = Codes(countries.map((country) => country.code))

// A nation's snapshot file: gzipped for the larger sources.
export const file = (nation: Nation) =>
  `${nation.snapshot ?? nation.id}${nation.source === "Boundary" || nation.source === "LandBoard" ? ".json.gz" : ".json"}`

export interface Land {
  readonly type: "Feature"
  readonly geometry: Polygon | MultiPolygon
  // `iso` is the ISO 3166-2 code the source gives the area, as it gives it:
  // the build keeps it only if it is one.
  readonly properties: { readonly code: string; readonly name: string; readonly iso?: string }
}

const json = (nation: Nation): unknown => JSON.parse(readFileSync(snapshot(file(nation)), "utf8"))

const gzipped = (nation: Nation): unknown =>
  JSON.parse(gunzipSync(readFileSync(snapshot(file(nation)))).toString("utf8"))

const digest = (value: string) => createHash("sha256").update(value).digest("hex")

// Natural Earth 1:10m Admin 1, one snapshot per country.
const naturalEarth = Schema.Struct({
  source: Schema.Literal(
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson",
  ),
  sha256: Schema.Literal("22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5"),
  retrieved: Schema.NonEmptyString,
  features: Schema.Array(
    Schema.Struct({
      type: Schema.Literal("Feature"),
      properties: Schema.Struct({
        adm0_a3: Schema.NonEmptyString,
        adm1_code: Schema.NonEmptyString,
        iso_3166_2: Schema.NonEmptyString,
        name: Schema.NullOr(Schema.NonEmptyString),
        region: Schema.NullOr(Schema.String),
        region_cod: Schema.NullOr(Schema.String),
      }),
      geometry,
    }),
  ),
})

const readNaturalEarth = (nation: Extract<Nation, { source: "NaturalEarth" }>) => {
  const data = Schema.decodeUnknownSync(naturalEarth)(json(nation))

  const features = data.features.flatMap((feature): ReadonlyArray<Land> => {
    const { properties } = feature

    if (!(nation.members ?? [nation.country]).includes(properties.adm0_a3))
      throw new Error(`Wrong country in ${nation.id}`)

    if (nation.omit?.includes(properties.iso_3166_2)) return []
    // Natural Earth assigns Melilla Ceuta's region code; the city ISO codes are distinct.
    const city = properties.iso_3166_2 === "ES-CE" || properties.iso_3166_2 === "ES-ML"

    // The atlas repeats codes for Bogotá/Cundinamarca and Požega-Slavonia/Brod-Posavina.
    const native =
      nation.identifier === "adm1_code"
        ? properties.adm1_code
        : Match.value(properties).pipe(
            Match.when({ adm0_a3: "COL", name: "Bogota", iso_3166_2: "CO-CUN" }, () => "CO-DC"),
            Match.when({ adm0_a3: "HRV", adm1_code: "HRV-1604" }, () => "HR-11"),
            Match.when({ adm0_a3: "PER", adm1_code: "PER-587" }, () => "PE-LMA"),
            Match.orElse((part) => part.iso_3166_2),
          )

    const grouped =
      properties.iso_3166_2 === "AU-X03~"
        ? "AU-TAS"
        : nation.level === "division" || city
          ? native
          : properties.region_cod?.trim()

    const code = grouped === undefined ? undefined : (nation.joins?.[grouped] ?? grouped)

    // Macquarie belongs to Tasmania; Lord Howe belongs to New South Wales.
    const parent =
      nation.country === "AUS"
        ? data.features.find((part) => part.properties.iso_3166_2 === code)?.properties.name
        : nation.level === "region"
          ? properties.region
          : properties.name

    const name = code === undefined ? undefined : (nation.names?.[code] ?? parent)

    if (!code || !name) throw new Error(`No region for ${properties.iso_3166_2}`)

    // A part joined into another area leaves the code to that area's own part.
    const iso =
      code !== grouped
        ? undefined
        : nation.level === "region" && !city
          ? code
          : nation.identifier === "adm1_code"
            ? properties.iso_3166_2
            : native

    return [
      {
        type: feature.type,
        geometry: feature.geometry,
        properties: iso === undefined ? { code, name } : { code, name, iso },
      },
    ]
  })

  const codes = new Set(features.map((feature) => feature.properties.code))

  const expected = new Set([
    ...nation.codes,
    ...(nation.context ?? []).flatMap((part) => part.codes),
  ])

  if (codes.size !== expected.size || [...expected].some((code) => !codes.has(code)))
    throw new Error(`${nation.id}: unexpected subdivision identifiers`)

  return features
}

// ONS International Territorial Level 1 regions, January 2025, for the UK.
const ons = Schema.Struct({
  source: Schema.Literal(
    "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/ITL1_JAN_2025_UK_BUC/FeatureServer/0/query?where=1%3D1&outFields=ITL125CD%2CITL125NM&outSR=4326&orderByFields=ITL125CD&f=geojson",
  ),
  sha256: Schema.Literal("d3b0ac15b9fa01d5ed2f1d3d6f7f04f6c1b33cbd96bf5768b627d3a63af44e17"),
  retrieved: Schema.NonEmptyString,
  type: Schema.Literal("FeatureCollection"),
  features: Schema.Array(
    Schema.Struct({
      type: Schema.Literal("Feature"),
      properties: Schema.Struct({
        ITL125CD: Codes([
          "TLC",
          "TLD",
          "TLE",
          "TLF",
          "TLG",
          "TLH",
          "TLI",
          "TLJ",
          "TLK",
          "TLL",
          "TLM",
          "TLN",
        ]),
        ITL125NM: Schema.NonEmptyString,
      }),
      geometry,
    }),
  ),
})

const readONS = (nation: Nation): ReadonlyArray<Land> => {
  const data = Schema.decodeUnknownSync(ons)(json(nation))
  const codes = new Set(data.features.map((feature) => feature.properties.ITL125CD))

  if (codes.size !== 12 || data.features.length !== 12)
    throw new Error("ONS's UK map must contain 12 distinct ITL1 regions")

  return data.features.map((feature) => ({
    type: feature.type,
    geometry: feature.geometry,
    properties: { code: feature.properties.ITL125CD, name: feature.properties.ITL125NM },
  }))
}

// Tailte Éireann's 2024 local authorities, fetched in five pages.
const tailtePages = [
  ["84a90db144fa9c20c9c11c40601845a2751f648438e8fff5a061a28a94d10f48", 2000],
  ["33ed2109fea7e54a1b925837435601b8fd0019140bf5c607cc8e63cd442bcfc4", 2000],
  ["5d37051fc4f3d08fab19b9a5b2d52e9144a6c5080b4bc1850e2f9c04a3dde469", 2000],
  ["9ac3aaa0d02935d0633e563854409aa782ed3320ec9884eca4dd6089bc27f439", 2000],
  ["34b7a734b7765bbb434d574803572d5094eecf9e39035db9cae97e452641f7ae", 1161],
] as const

const tailte = Schema.Struct({
  retrieved: Schema.NonEmptyString,
  pages: Schema.Array(
    Schema.Struct({
      source: Schema.NonEmptyString,
      sha256: Schema.NonEmptyString,
      type: Schema.Literal("FeatureCollection"),
      features: Schema.Array(
        Schema.Struct({
          type: Schema.Literal("Feature"),
          properties: Schema.Struct({
            OBJECTID: Schema.Finite,
            ENG_NAME_VALUE: Codes(councils),
          }),
          geometry,
        }),
      ),
    }),
  ),
})

const readTailte = (nation: Nation): ReadonlyArray<Land> => {
  const data = Schema.decodeUnknownSync(tailte)(json(nation))

  if (data.pages.length !== tailtePages.length) throw new Error("Missing Irish boundary pages")

  for (const [index, page] of data.pages.entries()) {
    const [sha256, count] = tailtePages[index] ?? []

    if (page.sha256 !== sha256 || page.features.length !== count)
      throw new Error("Wrong Irish boundary page")
  }

  const features = data.pages.flatMap((page) => page.features)
  const ids = new Set(features.map((feature) => feature.properties.OBJECTID))
  const areas = new Set(features.map((feature) => feature.properties.ENG_NAME_VALUE))

  if (ids.size !== 9161 || features.length !== 9161 || areas.size !== councils.length)
    throw new Error("Ireland's map must contain all 9161 parts of its 31 local authorities")

  return features.map((feature) => {
    const code = feature.properties.ENG_NAME_VALUE

    const name = code
      .replace(/ COUNCIL$/, "")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace(" And ", " and ")
      .replace("Dun Laoghaire", "Dún Laoghaire")

    return { type: feature.type, geometry: feature.geometry, properties: { code, name } }
  })
}

// The Estonian Land and Spatial Development Board's counties, valid on
// 12 November 2026.
// The features are hashed as this schema decodes them, so it lists every
// property the snapshot holds.
const landBoard = Schema.Struct({
  featuresSha256: Schema.Literal(
    "fe37c00f464db30ae0bc940fc836498de616f142ea53ad72d9311551101dd14f",
  ),
  valid: Schema.Literal("2026-11-12"),
  features: Schema.Array(
    Schema.Struct({
      type: Schema.Literal("Feature"),
      properties: Schema.Struct({
        fid: Schema.Finite,
        ehak_kood: Codes(counties),
        maakond: Schema.NonEmptyString,
        tyyp: Schema.Literal("maakond"),
        vers_algus: Schema.NonEmptyString,
        vers_lopp: Schema.Null,
        seaduslik_alus: Schema.NonEmptyString,
      }),
      geometry,
    }),
  ),
})

const readLandBoard = (nation: Nation): ReadonlyArray<Land> => {
  const data = Schema.decodeUnknownSync(landBoard)(gzipped(nation))

  if (digest(JSON.stringify(data.features)) !== data.featuresSha256)
    throw new Error("Estonia's pinned county features changed")
  const codes = new Set(data.features.map((feature) => feature.properties.ehak_kood))

  if (data.features.length !== 15 || codes.size !== 15)
    throw new Error("Expected 15 distinct Estonian counties")

  return data.features.map((feature) => ({
    type: feature.type,
    geometry: feature.geometry,
    properties: {
      code: feature.properties.ehak_kood,
      name: feature.properties.maakond.replace(/ maakond$/, ""),
      // ISO 3166-2:EE numbers counties by their EHAK code: 0037 is EE-37.
      iso: `EE-${feature.properties.ehak_kood.slice(2)}`,
    },
  }))
}

// National boundary sources other than Natural Earth: geoBoundaries,
// national agencies, Overture and the World Bank. Each snapshot names its
// publisher and licence, and holds the features of every input it was built
// from with their hash.
const credit = Schema.Struct({
  publisher: Schema.NonEmptyString,
  url: Schema.NonEmptyString,
  vintage: Schema.NonEmptyString,
  license: Schema.NonEmptyString,
  licenseUrl: Schema.NonEmptyString,
  kind: Schema.Literals(["Administrative", "Statistical", "Geographic"]),
})

export type Credit = typeof credit.Type

const boundary = Schema.Struct({
  country: Country,
  credit,
  inputs: Schema.Array(
    Schema.Struct({
      hash: Schema.NonEmptyString,
      features: Schema.Array(
        Schema.Struct({
          type: Schema.Literal("Feature"),
          geometry,
          properties: Schema.Struct({
            code: Schema.NonEmptyString,
            name: Schema.NonEmptyString,
            native: Schema.Unknown,
          }),
        }),
      ),
    }),
  ),
})

// The ISO 3166-2 code a feature's publisher gives it: geoBoundaries'
// shapeISO, or the region an Overture division of the region subtype is.
const geoBoundaries = Schema.Struct({ shapeISO: Schema.String })
const overture = Schema.Struct({ subtype: Schema.Literal("region"), region: Schema.String })

const isoOf = (native: unknown): string | undefined =>
  Schema.is(geoBoundaries)(native)
    ? native.shapeISO
    : Schema.is(overture)(native)
      ? native.region
      : undefined

type Part = Land & { readonly geometry: typeof geometry.Type }

type Cuts = NonNullable<Extract<Nation, { source: "Boundary" }>["cuts"]>

const multi = (coordinates: unknown) =>
  Schema.decodeUnknownSync(geometry)({ type: "MultiPolygon", coordinates })

// Subtract a sourced child or disputed area from its enclosing polygon.
// This changes no boundary line and keeps the source features in the snapshot.
const cutBoundaries = (features: ReadonlyArray<Part>, cuts: Cuts): ReadonlyArray<Part> => {
  let parts = features

  for (const operation of cuts) {
    if (!parts.some((part) => part.properties.code === operation.from))
      throw new Error(`Missing cut parent ${operation.from}`)

    const removed = operation.remove.map((code) => {
      const part = parts.find((candidate) => candidate.properties.code === code)

      if (part === undefined) throw new Error(`Missing cut boundary ${code}`)

      return part.geometry.coordinates
    })

    parts = parts.map((part) =>
      part.properties.code !== operation.from
        ? part
        : { ...part, geometry: multi(difference(part.geometry.coordinates, ...removed)) },
    )
  }

  return parts
}

// A land mask removes coastal water without moving an administrative border.
const clipBoundaries = (features: ReadonlyArray<Part>, code: string): ReadonlyArray<Part> => {
  const coast = features.find((part) => part.properties.code === code)

  if (coast === undefined) throw new Error(`Missing coast ${code}`)

  return features.flatMap((part) =>
    part === coast
      ? []
      : [
          {
            ...part,
            geometry: multi(intersection(part.geometry.coordinates, coast.geometry.coordinates)),
          },
        ],
  )
}

const readBoundary = (nation: Extract<Nation, { source: "Boundary" }>) => {
  const { id, codes, context = [], land = [], coast, cuts = [] } = nation
  const data = Schema.decodeUnknownSync(boundary)(gzipped(nation))

  if (data.country !== nation.country) throw new Error(`Wrong boundary snapshot for ${id}`)

  for (const part of data.inputs)
    if (digest(JSON.stringify(part.features)) !== part.hash)
      throw new Error(`A boundary input of ${id} does not match its hash`)

  const features = data.inputs.flatMap((part) =>
    part.features.map((feature) => {
      const { code, name, native } = feature.properties
      const iso = isoOf(native)

      return {
        type: feature.type,
        geometry: feature.geometry,
        properties: iso === undefined ? { code, name } : { code, name, iso },
      }
    }),
  )

  const found = new Set(features.map((part) => part.properties.code))

  const expected = new Set([
    ...codes,
    ...context.flatMap((part) => part.codes),
    ...land,
    ...(coast === undefined ? [] : [coast]),
  ])

  if (found.size !== expected.size || [...expected].some((code) => !found.has(code)))
    throw new Error(`${id}: unexpected administrative divisions`)

  const clipped = coast === undefined ? features : clipBoundaries(features, coast)

  return { lands: cutBoundaries(clipped, cuts), credit: data.credit }
}

// A national map's subdivisions, and for a boundary source the publisher its
// licence requires the map to credit.
export type Read =
  | { readonly source: "Boundary"; readonly lands: ReadonlyArray<Land>; readonly credit: Credit }
  | {
      readonly source: Exclude<Nation["source"], "Boundary">
      readonly lands: ReadonlyArray<Land>
    }

// A national map's land with what the borders policy gives another country
// cut out (borders.ts).
const settled = (country: Code, lands: ReadonlyArray<Land>): ReadonlyArray<Land> =>
  trims.some((each) => each.country === country)
    ? lands.map((land) => ({
        ...land,
        geometry: {
          type: "MultiPolygon",
          coordinates: trim(country, {
            shapes:
              land.geometry.type === "Polygon"
                ? [pairs(land.geometry.coordinates)]
                : land.geometry.coordinates.map(pairs),
            outlines,
          }),
        },
      }))
    : lands

export const read = (nation: Nation): Read => {
  const raw = Match.value(nation).pipe(
    Match.when({ source: "ONS" }, (each) => ({ source: each.source, lands: readONS(each) })),
    Match.when({ source: "Tailte" }, (each) => ({ source: each.source, lands: readTailte(each) })),
    Match.when({ source: "LandBoard" }, (each) => ({
      source: each.source,
      lands: readLandBoard(each),
    })),
    Match.when({ source: "NaturalEarth" }, (each) => ({
      source: each.source,
      lands: readNaturalEarth(each),
    })),
    Match.when({ source: "Boundary" }, (each) => ({ source: each.source, ...readBoundary(each) })),
    Match.exhaustive,
  )

  return { ...raw, lands: settled(nation.country, raw.lands) }
}
