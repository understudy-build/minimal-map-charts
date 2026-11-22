import { type Country, countries } from "./countries.ts"
import { areas } from "./data/areas.gen.ts"

type Alpha2 = (typeof countries)[number]["alpha2"]

// A subdivision by its ISO 3166-2 code: its country's alpha-2 code, a hyphen,
// and one to three letters or digits, e.g. "US-CA" for California.
export type Area = `${Alpha2}-${string}`

const byAlpha2 = new Map<string, Country>(countries.map(({ code, alpha2 }) => [alpha2, code]))
const byAlpha3 = new Map<string, string>(countries.map(({ code, alpha2 }) => [code, alpha2]))

const format = /^[A-Z]{2}-[A-Z0-9]{1,3}$/

export const isArea = (input: string): input is Area =>
  format.test(input) && byAlpha2.has(input.slice(0, 2))

// The country an area is in.
export const countryOf = (area: Area): Country => {
  const country = byAlpha2.get(area.slice(0, 2))

  if (country === undefined) throw new Error(`"${area}" starts with no country's code.`)

  return country
}

// The codes each sheet draws, split the first time one is looked up.
let drawn: ReadonlyMap<Country, ReadonlySet<string>> | undefined

// Whether the area's country has a sheet that draws it under this code.
export const isDrawn = (area: Area): boolean => {
  drawn ??= new Map(
    countries.flatMap(({ code }) => {
      const list = areas[code]

      return list === undefined ? [] : [[code, new Set(list.split(" "))] as const]
    }),
  )

  return drawn.get(countryOf(area))?.has(area.slice(3)) ?? false
}

// The code someone most likely meant: "us-ca", "US.CA" or "USA-CA" → "US-CA".
export const suggest = (input: string): Area | undefined => {
  const [, prefix = "", rest = ""] =
    /^([A-Z]{2,3})[-._ ]([A-Z0-9]{1,3})$/.exec(input.trim().toUpperCase()) ?? []
  const candidate = `${byAlpha3.get(prefix) ?? prefix}-${rest}`

  return isArea(candidate) && isDrawn(candidate) ? candidate : undefined
}
