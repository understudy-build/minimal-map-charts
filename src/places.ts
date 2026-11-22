import type { Area } from "./areas.ts"
import type { Country } from "./countries.ts"
import type { Degrees } from "./project.ts"

// A country's places, as Natural Earth lists them: each one's name, the area
// of the country's own map that holds it, or null where the country has no
// map of its own, its longitude and latitude, then its other names.
export type Gazetteer = ReadonlyArray<
  readonly [name: string, area: Area | null, lon: number, lat: number, ...others: Array<string>]
>

// A name as places are matched by it: without accents, case, spaces or
// punctuation, so "Zurich", "Zürich" and "ZURICH" match, as do
// "Washington DC" and "Washington, D.C.".
export const normal = (name: string) =>
  name
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]/gu, "")

// A country's places, imported the first time a spec names one; undefined
// for a country Natural Earth lists no place in. Every call for a country
// shares one import.
const loaded = new Map<Country, Promise<Gazetteer | undefined>>()

export const places = (country: Country): Promise<Gazetteer | undefined> => {
  const loading =
    loaded.get(country) ??
    import("./data/places.gen.ts").then(async ({ gazetteer }) => {
      const load = gazetteer[country]

      return load === undefined ? undefined : (await load()).default
    })

  loaded.set(country, loading)

  return loading
}

export type Found =
  | { readonly kind: "Found"; readonly at: Degrees; readonly area: Area | undefined }
  // No place goes by the name; `suggestion` is the name of one that nearly
  // does.
  | { readonly kind: "Unknown"; readonly suggestion: string | undefined }
  // More than one place goes by the name, or none in the area given: the
  // areas of those that do.
  | { readonly kind: "Ambiguous"; readonly areas: ReadonlyArray<Area> }

// How many letters two names differ by, up to `most`; past it, `most + 1`.
const distance = (left: string, right: string, most: number) => {
  if (Math.abs(left.length - right.length) > most) return most + 1

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let row = 0; row < left.length; row += 1) {
    const current = [row + 1]

    for (let column = 0; column < right.length; column += 1)
      current.push(
        Math.min(
          (previous[column + 1] ?? 0) + 1,
          (current[column] ?? 0) + 1,
          (previous[column] ?? 0) + (left[row] === right[column] ? 0 : 1),
        ),
      )

    previous = current
  }

  return previous.at(-1) ?? most + 1
}

// The place a name most likely meant: one whose name starts with it, as
// "Washington" starts "Washington, D.C.", else one a letter or two away.
const suggest = (gazetteer: Gazetteer, wanted: string): string | undefined => {
  const most = wanted.length < 5 ? 1 : 2
  const scored = gazetteer.flatMap(([name, , , , ...others]) => {
    const scores = [name, ...others].map((each) => {
      const key = normal(each)

      return wanted.length >= 4 && key.startsWith(wanted) ? 0 : distance(wanted, key, most)
    })
    const best = Math.min(...scores)

    return best <= most ? [{ name, best }] : []
  })

  return scored.toSorted((left, right) => left.best - right.best)[0]?.name
}

// The place a spec names in a gazetteer, by any of its names, in `area` when
// given.
export const find = (
  gazetteer: Gazetteer,
  { place, area }: { readonly place: string; readonly area?: Area | undefined },
): Found => {
  const wanted = normal(place)
  // A place's own name before the others it goes by: Natural Earth lists
  // Dongguan among Guangzhou's other names, and Dongguan as a place.
  const own = gazetteer.filter(([name]) => normal(name) === wanted)
  const named =
    own.length > 0
      ? own
      : gazetteer.filter(([, , , , ...others]) => others.some((each) => normal(each) === wanted))

  if (named.length === 0) return { kind: "Unknown", suggestion: suggest(gazetteer, wanted) }

  const matches = area === undefined ? named : named.filter(([, each]) => each === area)
  const [only] = matches

  if (only === undefined || matches.length > 1)
    return {
      kind: "Ambiguous",
      areas: named.flatMap(([, each]) => (each === null ? [] : [each])).toSorted(),
    }

  const [, at, lon, lat] = only

  return { kind: "Found", at: [lon, lat], area: at ?? undefined }
}
