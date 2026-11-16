import { type Country, countries } from "./countries.ts"
import { national, sheets } from "./data/sheets.gen.ts"
import { regions } from "./regions.ts"

// An outline as rings: the first point of each, then the step to each next
// point, all in whole units.
export type Steps = ReadonlyArray<ReadonlyArray<number>>

export interface Area {
  readonly code: string
  readonly name: string
  readonly outline: Steps
}

// An overseas region in its own box beside the map, `width` by `height`
// units. It takes its country's shade unless it is context only.
export interface Inset {
  readonly name: string
  readonly country: Country
  // Context-only areas have no applicable national observation.
  readonly coverage?: "National" | "Context"
  readonly width: number
  readonly height: number
  readonly outline: Steps
  readonly areas?: ReadonlyArray<Area>
}

export interface Credit {
  readonly publisher: string
  readonly url: string
  readonly vintage: string
  readonly license: string
  readonly licenseUrl: string
  readonly kind: "Administrative" | "Statistical" | "Geographic"
}

// One projected map, `width` by `height` units: each country it can draw,
// the land around them, and its insets.
export interface Sheet {
  readonly width: number
  readonly height: number
  readonly outlines: Readonly<Partial<Record<Country, Steps>>>
  readonly land: Steps
  readonly insets: ReadonlyArray<Inset>
  // Countries too small to draw as a shape, as a point on the sheet: a
  // renderer draws them as dots.
  readonly dots?: Readonly<Partial<Record<Country, readonly [number, number]>>>
  readonly subdivisions?: {
    readonly country: Country
    readonly areas: ReadonlyArray<Area>
  } & (
    | { readonly source: "NaturalEarth" | "ONS" | "Tailte" | "LandBoard" }
    | { readonly source: "Boundary"; readonly credit: Credit }
  )
}

// A map: the world, a region by its id, or a country's own map by its code.
export type SheetId = keyof typeof sheets | keyof typeof national

type Nation = keyof typeof national

// The countries with a map of their own.
const isNation = (code: Country): code is Nation => Object.hasOwn(national, code)

export const nations: ReadonlyArray<Nation> = countries
  .map((country) => country.code)
  .filter(isNation)

export const sheetIds: ReadonlyArray<SheetId> = [
  "world",
  ...regions.map((region) => region.id),
  ...nations,
]

const loaders: Record<SheetId, () => Promise<{ readonly default: Sheet }>> = {
  ...sheets,
  ...national,
}

const loaded = new Map<SheetId, Promise<Sheet>>()

// Each sheet is its own module, imported the first time it is drawn, so a
// page downloads only the maps it shows. Every call for a sheet returns the
// same promise.
export const load = (id: SheetId): Promise<Sheet> => {
  const loading = loaded.get(id) ?? loaders[id]().then((module) => module.default)

  loaded.set(id, loading)

  return loading
}

const naturalEarth = {
  publisher: "Natural Earth",
  url: "https://www.naturalearthdata.com",
  license: "Public domain",
  licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
} as const

// Who drew a sheet's boundaries, as its licence requires the map to say.
export const credits = (sheet: Sheet): ReadonlyArray<Credit> => {
  const outlines: Credit = { ...naturalEarth, vintage: "v5.1.2", kind: "Geographic" }
  const { subdivisions } = sheet

  if (subdivisions === undefined) return [outlines]

  switch (subdivisions.source) {
    case "Boundary":
      return [outlines, subdivisions.credit]
    case "NaturalEarth":
      return [{ ...naturalEarth, vintage: "Admin 1 v5.1.2", kind: "Administrative" }]
    case "ONS":
      return [
        {
          publisher:
            "Office for National Statistics. Contains OS data © Crown copyright and database right 2025",
          url: "https://ckan.publishing.service.gov.uk/dataset/international-territorial-level-1-january-2025-boundaries-uk-buc",
          vintage: "January 2025",
          license: "Open Government Licence v3.0",
          licenseUrl: "https://www.ons.gov.uk/methodology/geography/licences/",
          kind: "Statistical",
        },
      ]
    case "Tailte":
      return [
        {
          publisher: "Tailte Éireann",
          url: "https://www.arcgis.com/home/item.html?id=ed592af6f0444bf1b0becdb5925f9477",
          vintage: "2024",
          license: "CC BY 4.0",
          licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
          kind: "Administrative",
        },
      ]
    case "LandBoard":
      return [
        {
          publisher: "Estonian Land and Spatial Development Board",
          url: "https://geoportaal.maaruum.ee/eng/spatial-data/administrative-and-settlement-division-p312.html",
          vintage: "12 November 2026",
          // civicdata never recorded this licence; check it before publishing.
          license: "Publisher's open data terms",
          licenseUrl:
            "https://geoportaal.maaruum.ee/eng/spatial-data/administrative-and-settlement-division-p312.html",
          kind: "Administrative",
        },
      ]
  }
}
