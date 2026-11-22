// ISO 3166-2 subdivision codes, to check the code each national sheet gives
// its areas. iso-3166-2.json is data/iso_3166-2.json of Debian's iso-codes
// v4.20.1 (LGPL-2.1-or-later), unchanged:
// https://salsa.debian.org/iso-codes-team/iso-codes/-/raw/v4.20.1/data/iso_3166-2.json
// It tracks ISO's own change notices, and lists no code ISO has withdrawn.
import { readFileSync } from "node:fs"

import { Schema } from "effect"

import { type Country, countries } from "../../src/countries.ts"

const Subdivision = Schema.Struct({
  code: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  type: Schema.NonEmptyString,
  // The subdivision this one lies in, for a code below the top level.
  parent: Schema.optional(Schema.NonEmptyString),
})

export type Subdivision = typeof Subdivision.Type

const list = Schema.decodeUnknownSync(Schema.Struct({ "3166-2": Schema.Array(Subdivision) }))(
  JSON.parse(readFileSync(new URL("iso-3166-2.json", import.meta.url), "utf8")),
)["3166-2"]

const byCode = new Map(list.map((subdivision) => [subdivision.code, subdivision]))
const prefixes = new Map<Country, string>(
  countries.map((country) => [country.code, country.alpha2]),
)

// The subdivision `code` names in `country`, if it is one of its ISO 3166-2
// codes. Kosovo (XK) and the Channel Islands (JG) have none.
export const subdivision = (country: Country, code: string): Subdivision | undefined => {
  const found = byCode.get(code)

  return found !== undefined && code.startsWith(`${prefixes.get(country)}-`) ? found : undefined
}
