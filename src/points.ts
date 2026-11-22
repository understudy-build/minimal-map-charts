import type { Area } from "./areas.ts"
import type { Country } from "./countries.ts"
import type { Degrees } from "./project.ts"
import type { Credit } from "./sheet.ts"
import { type Issue, nameOf, type Path, type Points, type Site } from "./spec.ts"

// A site where it is: at its coordinates, or at its place's.
export interface Resolved {
  readonly name: string
  readonly at: Degrees
  readonly value: number | undefined
  // The place's country and area, when the site names a place.
  readonly country: Country | undefined
  readonly area: Area | undefined
  readonly path: Path
}

// Who listed the places a site can name.
export const credit: Credit = {
  publisher: "Natural Earth",
  url: "https://www.naturalearthdata.com",
  vintage: "populated places v5.1.2",
  license: "Public domain",
  licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
  kind: "Geographic",
}

// Each site where it is, or why its place cannot be found. The code that
// finds places, and a country's places, load only when a site names a place
// in it.
export const resolve = async (
  points: Points | undefined,
): Promise<{ readonly sites: ReadonlyArray<Resolved>; readonly issues: ReadonlyArray<Issue> }> => {
  const listed: ReadonlyArray<{ readonly each: Site; readonly value: number | undefined }> =
    points === undefined
      ? []
      : points.kind === "bubble"
        ? points.sites.map((each) => ({ each, value: each.value }))
        : points.sites.map((each) => ({ each, value: undefined }))
  const found = await Promise.all(
    listed.map(async ({ each, value }, index): Promise<Resolved | Issue> => {
      const path = ["points", "sites", index]
      const name = nameOf(each)

      if (!("place" in each))
        return {
          name,
          at: [each.lon, each.lat],
          value,
          country: undefined,
          area: undefined,
          path,
        }

      const { place, country, area } = each
      const { find, places } = await import("./places.ts")
      const gazetteer = await places(country)
      const result =
        gazetteer === undefined
          ? ({ kind: "Unknown", suggestion: undefined } as const)
          : find(gazetteer, { place, area })

      switch (result.kind) {
        case "Found":
          return { name, at: result.at, value, country, area: result.area, path }
        case "Unknown":
          return {
            kind: "UnknownPlace",
            path: [...path, "place"],
            place,
            country,
            suggestion: result.suggestion,
          }
        case "Ambiguous":
          return {
            kind: "AmbiguousPlace",
            path: [...path, "place"],
            place,
            country,
            area,
            areas: result.areas,
          }
      }
    }),
  )

  return {
    sites: found.flatMap((each) => ("kind" in each ? [] : [each])),
    issues: found.flatMap((each) => ("kind" in each ? [each] : [])),
  }
}

// Sizes as a share of the map's width: the largest bubble's radius, a dot's,
// and the least a bubble above 0 shrinks to, so it can still be pointed at.
const largest = 0.03
const dot = 0.0035
const least = 0.0015

// The radius each value draws at, in map units. A bubble's area is
// proportional to its value; 0 draws the least ring.
export const radius = (
  kind: Points["kind"],
  { width, peak }: { readonly width: number; readonly peak: number },
) => {
  if (kind === "dot") return () => width * dot

  return (value: number) =>
    peak <= 0 ? width * least : Math.max(width * least, width * largest * Math.sqrt(value / peak))
}

// The legend's circles: the largest value rounded down to its first digit,
// and a half and a quarter of it, so their areas read as two and four times.
export const sizes = (peak: number): ReadonlyArray<number> => {
  if (peak <= 0) return []

  const step = 10 ** Math.floor(Math.log10(peak))
  const top = Math.floor(peak / step) * step

  return [top, top / 2, top / 4]
}

// The legend's tallest circle: the largest a bubble draws, so a page can
// reserve its room before it knows the values.
export const legendHeight = (width: number) => width * largest * 2
