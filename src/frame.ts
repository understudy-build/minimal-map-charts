import { type Country, countries } from "./countries.ts"
import { regions } from "./regions.ts"
import { nations, type SheetId, sheetIds } from "./sheet.ts"

// The countries each sheet frames: the world holds every country, a region its
// members, and a country's own map that country alone.
const framed = new Map<SheetId, ReadonlyArray<Country>>([
  ["world", countries.map((country) => country.code)],
  ...regions.map((region) => [region.id, region.countries] as const),
  ...nations.map((nation) => [nation, [nation]] as const),
])

export const members = (sheet: SheetId): ReadonlyArray<Country> => framed.get(sheet) ?? []

// The sheets that frame every one of these countries, narrowest first: the
// regions in their listed order, then the world. A country's own map is never
// derived; ask for it by its code.
export const frames = (codes: ReadonlyArray<Country>): ReadonlyArray<SheetId> =>
  codes.length === 0
    ? ["world"]
    : [
        ...regions
          .filter((region) => codes.every((code) => region.countries.some((each) => each === code)))
          .map((region) => region.id),
        "world",
      ]

export const isSheet = (input: string): input is SheetId =>
  (sheetIds as ReadonlyArray<string>).includes(input)
