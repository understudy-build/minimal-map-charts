import { gap } from "./box.ts"
import { type Country, countries } from "./countries.ts"
import { globe } from "./data/globe.gen.ts"
import { frames } from "./frame.ts"
import { isRegion, type Region, regions } from "./regions.ts"
import type { SheetId } from "./sheet.ts"

// A country, a region's countries, every country, or a country with its own
// inset rule.
export type Place =
  | Country
  | Region["id"]
  | "world"
  | { readonly country: Country; readonly insets?: boolean }

// One frame of the map.
export interface Panel {
  readonly places: ReadonlyArray<Place>
}

interface Shared {
  // "shared", the default: one kilometre is as long in every panel, so areas
  // compare. "fit": every panel as tall as the others.
  readonly scale?: "shared" | "fit"
  // Draw the boxes a sheet gives a country's far parts, such as the Canaries.
  // Default true.
  readonly insets?: boolean
  // Draw the land and countries around the panel's countries. Default true.
  readonly context?: boolean
}

// How a map arranges its countries. With `places`, countries far apart split
// into panels side by side, such as the United States and Western Europe;
// without either, the places are the countries in the fill. With `panels`,
// each panel is drawn as given, even if its countries are far apart.
export type Layout = Shared &
  (
    | { readonly places?: ReadonlyArray<Place>; readonly panels?: never }
    | { readonly panels: ReadonlyArray<Panel>; readonly places?: never }
  )

export interface Member {
  readonly country: Country
  readonly insets: boolean
}

// A panel with its places resolved to countries, and the narrowest prebuilt
// sheet that holds them all, which it crops.
export interface Group {
  readonly sheet: SheetId
  readonly members: ReadonlyArray<Member>
}

const members = (places: ReadonlyArray<Place>, insets: boolean): ReadonlyArray<Member> => {
  const seen = new Map<Country, Member>()

  for (const place of places) {
    const listed: ReadonlyArray<Member> =
      typeof place === "object"
        ? [{ country: place.country, insets: place.insets ?? insets }]
        : place === "world"
          ? countries.map(({ code }) => ({ country: code, insets }))
          : isRegion(place)
            ? (regions.find((region) => region.id === place)?.countries ?? []).map((country) => ({
                country,
                insets,
              }))
            : [{ country: place, insets }]

    for (const member of listed) if (!seen.has(member.country)) seen.set(member.country, member)
  }

  return [...seen.values()]
}

// Countries closer than this share a panel: Europe stays whole, and the
// United States and Europe split.
const apart = 2000

// Splits members into groups of nearby countries, in the order they were
// first named. Countries with no box, too small for Natural Earth's outlines,
// join the first group.
const cluster = (all: ReadonlyArray<Member>): ReadonlyArray<ReadonlyArray<Member>> => {
  const boxed = all.flatMap((member) => {
    const box = globe[member.country]?.box

    return box === undefined ? [] : [{ member, box }]
  })
  const group = boxed.map((_, index) => index)
  const root = (index: number): number =>
    group[index] === index ? index : root(group[index] ?? index)

  for (const [i, left] of boxed.entries())
    for (const [j, right] of boxed.entries())
      if (j > i && gap(left.box, right.box) < apart) group[root(j)] = root(i)

  const groups = [
    ...Map.groupBy(
      boxed.map(({ member }, index) => ({ member, index })),
      ({ index }) => root(index),
    ).values(),
  ].map((each) => each.map(({ member }) => member))
  const unboxed = all.filter((member) => globe[member.country] === undefined)
  const [first = [], ...rest] = groups

  return unboxed.length === 0 && groups.length === 0 ? [] : [[...first, ...unboxed], ...rest]
}

const group = (each: ReadonlyArray<Member>): Group => ({
  sheet: frames(each.map((member) => member.country))[0] ?? "world",
  members: each,
})

// The panels a layout draws. `named` are the countries in the fill, the
// places when the layout lists none.
export const groups = (layout: Layout, named: ReadonlyArray<Country>): ReadonlyArray<Group> => {
  const insets = layout.insets ?? true

  if (layout.panels !== undefined)
    return layout.panels.map((panel) => group(members(panel.places, insets)))

  const places = layout.places ?? named

  // The world stays one panel: split by distance, island states would each
  // get their own.
  if (places.length === 0 || places.includes("world"))
    return [group(members(["world", ...places], insets))]

  return cluster(members(places, insets)).map(group)
}
