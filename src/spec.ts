import { type Country, countries, names } from "./countries.ts"
import { frames, isSheet, members } from "./frame.ts"
import type { SheetId } from "./sheet.ts"

// What a map shows. Every field is optional: `{}` draws the world, blank.
// Without `sheet`, the map draws the narrowest region that holds every
// country in `fill`, else the world.
export interface Spec {
  readonly sheet?: SheetId
  readonly title?: string
  // Who published the values, shown beside the boundary credits.
  readonly source?: string
  readonly fill?: Fill
}

export type Fill =
  | {
      readonly kind: "choropleth"
      readonly values: Values
      readonly scale?: Scale
      readonly better?: "higher" | "lower"
    }
  | { readonly kind: "highlight"; readonly countries: ReadonlyArray<Country> }

export type Values = Readonly<Partial<Record<Country, number>>>

export type Scale =
  // Classes of about the same number of countries, lowest first.
  | { readonly kind: "quantile"; readonly classes?: Classes }
  // Fixed bands, e.g. to keep shades meaning the same values across years.
  // A value at a break falls in the band above it.
  | { readonly kind: "breaks"; readonly at: ReadonlyArray<number> }

export type Classes = 3 | 4 | 5 | 6 | 7

export type Path = ReadonlyArray<string | number>

// Why a spec was refused, worded so a person or a model can fix it.
export type Issue =
  | { readonly kind: "Invalid"; readonly path: Path; readonly expected: string }
  | { readonly kind: "UnknownKey"; readonly path: Path; readonly key: string }
  | {
      readonly kind: "UnknownCountry"
      readonly path: Path
      readonly input: string
      readonly suggestion: Country | undefined
    }
  | {
      readonly kind: "NotOnSheet"
      readonly path: Path
      readonly country: Country
      readonly sheet: SheetId
      // The sheets that would hold every country in the fill, narrowest first.
      readonly sheets: ReadonlyArray<SheetId>
    }

export type Parsed =
  | { readonly ok: true; readonly spec: Spec }
  | { readonly ok: false; readonly issues: ReadonlyArray<Issue> }

const codes = new Set<string>(countries.map((country) => country.code))

const isCountry = (input: string): input is Country => codes.has(input)

const byAlpha2 = new Map<string, Country>(countries.map(({ code, alpha2 }) => [alpha2, code]))
// English names to codes, built the first time a name needs a suggestion.
let byName: ReadonlyMap<string, Country> | undefined

const fromName = (input: string) => {
  const english = names("en")

  byName ??= new Map(countries.map(({ code }) => [english(code).toLowerCase(), code]))

  return byName.get(input.trim().toLowerCase())
}

// The code someone most likely meant: "fra", "FR" or "France" → "FRA".
const suggest = (input: string): Country | undefined => {
  const upper = input.toUpperCase()

  return isCountry(upper) ? upper : (byAlpha2.get(upper) ?? fromName(input))
}

const isRecord = (input: unknown): input is Readonly<Record<string, unknown>> =>
  typeof input === "object" && input !== null && !Array.isArray(input)

const isClasses = (input: unknown): input is Classes =>
  input === 3 || input === 4 || input === 5 || input === 6 || input === 7

const isNumber = (input: unknown): input is number =>
  typeof input === "number" && Number.isFinite(input)

// The longest list of breaks: seven bands at most, as with quantiles.
const maxBreaks = 6

const keys =
  (path: Path, allowed: ReadonlyArray<string>) =>
  (input: Readonly<Record<string, unknown>>): ReadonlyArray<Issue> =>
    Object.keys(input)
      .filter((key) => !allowed.includes(key))
      .map((key) => ({ kind: "UnknownKey", path, key }))

interface Checked<A> {
  readonly value: A | undefined
  readonly issues: ReadonlyArray<Issue>
}

const country = (input: unknown, path: Path): Checked<Country> => {
  if (typeof input !== "string")
    return { value: undefined, issues: [{ kind: "Invalid", path, expected: "a country code" }] }

  return isCountry(input)
    ? { value: input, issues: [] }
    : {
        value: undefined,
        issues: [{ kind: "UnknownCountry", path, input, suggestion: suggest(input) }],
      }
}

const text = (input: unknown, path: Path): Checked<string> =>
  typeof input === "string" && input.trim() !== ""
    ? { value: input, issues: [] }
    : { value: undefined, issues: [{ kind: "Invalid", path, expected: "a non-empty string" }] }

const scale = (input: unknown, path: Path): Checked<Scale> => {
  if (!isRecord(input))
    return { value: undefined, issues: [{ kind: "Invalid", path, expected: "a scale object" }] }

  if (input["kind"] === "quantile") {
    const issues = keys(path, ["kind", "classes"])(input)
    const count = input["classes"]

    if (count === undefined) return { value: { kind: "quantile" }, issues }

    return isClasses(count)
      ? { value: { kind: "quantile", classes: count }, issues }
      : {
          value: undefined,
          issues: [
            ...issues,
            { kind: "Invalid", path: [...path, "classes"], expected: "3, 4, 5, 6 or 7" },
          ],
        }
  }

  if (input["kind"] === "breaks") {
    const issues = keys(path, ["kind", "at"])(input)
    const at = input["at"]

    const list: ReadonlyArray<unknown> = Array.isArray(at) ? at : []
    const numbers = list.filter(isNumber)

    const ascending =
      numbers.length === list.length &&
      numbers.length > 0 &&
      numbers.length <= maxBreaks &&
      numbers.every((each, index) => each > (numbers[index - 1] ?? Number.NEGATIVE_INFINITY))

    return ascending
      ? { value: { kind: "breaks", at: numbers }, issues }
      : {
          value: undefined,
          issues: [
            ...issues,
            {
              kind: "Invalid",
              path: [...path, "at"],
              expected: `1 to ${maxBreaks} finite numbers in strictly ascending order`,
            },
          ],
        }
  }

  return {
    value: undefined,
    issues: [{ kind: "Invalid", path: [...path, "kind"], expected: '"quantile" or "breaks"' }],
  }
}

const values = (input: unknown, path: Path): Checked<Values> => {
  if (!isRecord(input))
    return {
      value: undefined,
      issues: [{ kind: "Invalid", path, expected: "an object of numbers keyed by country code" }],
    }

  const issues: Array<Issue> = []
  const parsed: Partial<Record<Country, number>> = {}

  for (const [key, value] of Object.entries(input)) {
    const at = path.concat(key)
    const code = country(key, at)

    issues.push(...code.issues)

    if (!isNumber(value)) issues.push({ kind: "Invalid", path: at, expected: "a finite number" })
    else if (code.value !== undefined) parsed[code.value] = value
  }

  return { value: issues.length === 0 ? parsed : undefined, issues }
}

const fill = (input: unknown, path: Path): Checked<Fill> => {
  if (!isRecord(input))
    return { value: undefined, issues: [{ kind: "Invalid", path, expected: "a fill object" }] }

  if (input["kind"] === "choropleth") {
    const known = keys(path, ["kind", "values", "scale", "better"])(input)
    const parsed = values(input["values"], [...path, "values"])
    const scaled =
      input["scale"] === undefined ? undefined : scale(input["scale"], [...path, "scale"])
    const better = input["better"]

    const direction: ReadonlyArray<Issue> =
      better === undefined || better === "higher" || better === "lower"
        ? []
        : [{ kind: "Invalid", path: [...path, "better"], expected: '"higher" or "lower"' }]

    const issues = [...known, ...parsed.issues, ...(scaled?.issues ?? []), ...direction]

    if (issues.length > 0 || parsed.value === undefined) return { value: undefined, issues }

    return {
      value: {
        kind: "choropleth",
        values: parsed.value,
        ...(scaled?.value === undefined ? {} : { scale: scaled.value }),
        ...(better === "higher" || better === "lower" ? { better } : {}),
      },
      issues,
    }
  }

  if (input["kind"] === "highlight") {
    const known = keys(path, ["kind", "countries"])(input)
    const list = input["countries"]

    if (!Array.isArray(list) || list.length === 0)
      return {
        value: undefined,
        issues: [
          ...known,
          {
            kind: "Invalid",
            path: [...path, "countries"],
            expected: "a non-empty array of country codes",
          },
        ],
      }

    const issues: Array<Issue> = [...known]
    const picked: Array<Country> = []

    for (const [index, each] of list.entries()) {
      const at = path.concat("countries", index)
      const code = country(each, at)

      issues.push(...code.issues)

      if (code.value === undefined) continue

      if (picked.includes(code.value))
        issues.push({ kind: "Invalid", path: at, expected: "a code not listed before" })
      else picked.push(code.value)
    }

    return issues.length === 0
      ? { value: { kind: "highlight", countries: picked }, issues }
      : { value: undefined, issues }
  }

  return {
    value: undefined,
    issues: [{ kind: "Invalid", path: [...path, "kind"], expected: '"choropleth" or "highlight"' }],
  }
}

// The countries a fill names: a choropleth's in code order, a highlight's in
// its own order.
export const named = (input: Fill | undefined): ReadonlyArray<Country> => {
  if (input === undefined) return []

  switch (input.kind) {
    case "choropleth":
      return countries.flatMap(({ code }) => (input.values[code] === undefined ? [] : [code]))
    case "highlight":
      return input.countries
  }
}

// Each country the fill names that the sheet does not frame.
const placed = (sheet: SheetId, input: Fill): ReadonlyArray<Issue> => {
  const framed = new Set(members(sheet))
  const all = named(input)
  const path = input.kind === "choropleth" ? ["fill", "values"] : ["fill", "countries"]

  return all.flatMap((code, index): ReadonlyArray<Issue> =>
    framed.has(code)
      ? []
      : [
          {
            kind: "NotOnSheet",
            path: [...path, input.kind === "choropleth" ? code : index],
            country: code,
            sheet,
            sheets: frames(all),
          },
        ],
  )
}

// Reads untrusted input, from a model, a form or a URL, into a spec, or every
// reason it is not one.
export const parse = (input: unknown): Parsed => {
  if (!isRecord(input))
    return { ok: false, issues: [{ kind: "Invalid", path: [], expected: "a spec object" }] }

  const known = keys([], ["sheet", "title", "source", "fill"])(input)
  const sheet = input["sheet"]

  const framing: Checked<SheetId> =
    sheet === undefined
      ? { value: undefined, issues: [] }
      : typeof sheet === "string" && isSheet(sheet)
        ? { value: sheet, issues: [] }
        : {
            value: undefined,
            issues: [
              {
                kind: "Invalid",
                path: ["sheet"],
                expected: '"world", a region id or the code of a country with its own map',
              },
            ],
          }

  const title = input["title"] === undefined ? undefined : text(input["title"], ["title"])
  const source = input["source"] === undefined ? undefined : text(input["source"], ["source"])
  const filled = input["fill"] === undefined ? undefined : fill(input["fill"], ["fill"])

  const issues = [
    ...known,
    ...framing.issues,
    ...(title?.issues ?? []),
    ...(source?.issues ?? []),
    ...(filled?.issues ?? []),
  ]

  if (issues.length > 0) return { ok: false, issues }

  const off =
    framing.value === undefined || filled?.value === undefined
      ? []
      : placed(framing.value, filled.value)

  if (off.length > 0) return { ok: false, issues: off }

  return {
    ok: true,
    spec: {
      ...(framing.value === undefined ? {} : { sheet: framing.value }),
      ...(title?.value === undefined ? {} : { title: title.value }),
      ...(source?.value === undefined ? {} : { source: source.value }),
      ...(filled?.value === undefined ? {} : { fill: filled.value }),
    },
  }
}

const at = (path: Path) => (path.length === 0 ? "spec" : path.join("."))

// One line a person or a model can act on.
export const describe = (issue: Issue): string => {
  switch (issue.kind) {
    case "Invalid":
      return `${at(issue.path)}: expected ${issue.expected}.`
    case "UnknownKey":
      return `${at(issue.path)}: unknown key "${issue.key}".`
    case "UnknownCountry":
      return issue.suggestion === undefined
        ? `${at(issue.path)}: "${issue.input}" is not a country code. Use ISO 3166-1 alpha-3.`
        : `${at(issue.path)}: "${issue.input}" is not a country code. Did you mean "${issue.suggestion}"?`
    case "NotOnSheet":
      return `${at(issue.path)}: ${issue.country} is not on the "${issue.sheet}" sheet. Sheets that hold every country: ${issue.sheets.join(", ")}.`
  }
}

// The Standard Schema interface (standardschema.dev), so the spec plugs into
// model tool definitions, form libraries and anything else that accepts one.
interface Standard<Output> {
  readonly "~standard": {
    readonly version: 1
    readonly vendor: string
    readonly validate: (value: unknown) =>
      | { readonly value: Output; readonly issues?: undefined }
      | {
          readonly issues: ReadonlyArray<{ readonly message: string; readonly path: Path }>
        }
    readonly types?: { readonly input: unknown; readonly output: Output }
  }
}

export const Spec: Standard<Spec> = {
  "~standard": {
    version: 1,
    vendor: "@nicolastoulemont/minimal-maps",
    validate: (value) => {
      const parsed = parse(value)

      return parsed.ok
        ? { value: parsed.spec }
        : { issues: parsed.issues.map((issue) => ({ message: describe(issue), path: issue.path })) }
    },
  },
}
