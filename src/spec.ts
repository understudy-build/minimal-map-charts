import { type Area, countryOf, isArea, suggest as suggestArea } from "./areas.ts"
import { apart, type Colour, oklch } from "./colour.ts"
import { type Country, countries, names } from "./countries.ts"
import { frames, isSheet, members } from "./frame.ts"
import type { Layout, Panel, Place } from "./layout.ts"
import { isRegion } from "./regions.ts"
import { schema } from "./schema.ts"
import type { SheetId } from "./sheet.ts"

// What a map shows. Every field is optional: `{}` draws the world, blank.
// Without `sheet`, the map draws the narrowest region that holds every
// country in `fill`, else the world; a fill of areas draws their country's
// own map. `sheet` names a prebuilt map, or lays countries out in panels
// cropped from the prebuilt maps.
export interface Spec {
  readonly sheet?: SheetId | Layout
  readonly title?: string
  // Who published the values, shown beside the boundary credits.
  readonly source?: string
  readonly fill?: Fill
}

// A fill colours countries, or the areas of one country, never both.
export type Fill =
  | {
      readonly kind: "choropleth"
      // One number per country or per area, each once. Those left out show
      // as no data.
      readonly values: Values
      readonly scale?: Scale
      readonly better?: "higher" | "lower"
    }
  | {
      readonly kind: "highlight"
      readonly countries: ReadonlyArray<Country>
      // Defaults to the palette's colour.
      readonly colour?: Colour
    }
  | {
      readonly kind: "highlight"
      readonly areas: ReadonlyArray<Area>
      readonly colour?: Colour
    }

export type Value =
  | { readonly country: Country; readonly value: number }
  | { readonly area: Area; readonly value: number }

export type Values =
  | ReadonlyArray<Extract<Value, { readonly country: Country }>>
  | ReadonlyArray<Extract<Value, { readonly area: Area }>>

// A colour gives only its hue and chroma: the palette sets each class's
// lightness for the surface the map sits on.
export type Scale =
  // Classes of about the same number of countries, lowest first, in one
  // colour that defaults to the palette's.
  | { readonly kind: "quantile"; readonly classes?: Classes; readonly colour?: Colour }
  // Fixed bands, e.g. to keep shades meaning the same values across years.
  // A value at a break falls in the band above it.
  | { readonly kind: "breaks"; readonly at: ReadonlyArray<number>; readonly colour?: Colour }
  // Fixed bands either side of `mid`, e.g. losses and gains around zero:
  // bands below it in `below`, bands above it in `above`, a neutral band
  // holding it unless it sits on a break.
  | {
      readonly kind: "diverging"
      readonly at: ReadonlyArray<number>
      readonly mid: number
      readonly below: Colour
      readonly above: Colour
    }

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
      readonly kind: "UnknownArea"
      readonly path: Path
      readonly input: string
      readonly suggestion: Area | undefined
    }
  // The area's country has no sheet that draws it under this code: the code
  // is wrong, or the sheet keeps its source's code for that area. `parse`
  // finds a country with no map of its own; `draw` finds a code its
  // country's sheet does not draw.
  | { readonly kind: "NoArea"; readonly path: Path; readonly area: Area }
  | {
      readonly kind: "NotOnSheet"
      readonly path: Path
      readonly code: Country | Area
      readonly sheet: SheetId
      // The sheets that would hold every country, or every area, in the
      // fill, narrowest first.
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

const area = (input: unknown, path: Path): Checked<Area> => {
  if (typeof input !== "string")
    return { value: undefined, issues: [{ kind: "Invalid", path, expected: "a subdivision code" }] }

  if (!isArea(input))
    return {
      value: undefined,
      issues: [{ kind: "UnknownArea", path, input, suggestion: suggestArea(input) }],
    }

  // Only the country's sheet knows its areas' codes, so `draw` checks the
  // code once it has loaded the sheet.
  return isSheet(countryOf(input))
    ? { value: input, issues: [] }
    : { value: undefined, issues: [{ kind: "NoArea", path, area: input }] }
}

const text = (input: unknown, path: Path): Checked<string> =>
  typeof input === "string" && input.trim() !== ""
    ? { value: input, issues: [] }
    : { value: undefined, issues: [{ kind: "Invalid", path, expected: "a non-empty string" }] }

// The least chroma that shows a hue: below it a colour reads as grey.
const minChroma = 0.05

// How far apart, in degrees, the hues of a diverging scale must be to tell
// its sides apart.
const minApart = 60

const invalid = <A>(path: Path, expected: string): Checked<A> => ({
  value: undefined,
  issues: [{ kind: "Invalid", path, expected }],
})

const isColour = (input: unknown): input is Colour =>
  typeof input === "string" && /^#[0-9a-f]{6}$/i.test(input)

const colour = (input: unknown, path: Path): Checked<Colour> => {
  if (!isColour(input)) return invalid(path, 'a colour as "#rrggbb"')

  if (oklch(input).c < minChroma) return invalid(path, "a colour with a hue, not a grey")

  return { value: input, issues: [] }
}

const breaks = (input: unknown, path: Path): Checked<ReadonlyArray<number>> => {
  const list: ReadonlyArray<unknown> = Array.isArray(input) ? input : []
  const numbers = list.filter(isNumber)

  const ascending =
    numbers.length === list.length &&
    numbers.length > 0 &&
    numbers.length <= maxBreaks &&
    numbers.every((each, index) => each > (numbers[index - 1] ?? Number.NEGATIVE_INFINITY))

  return ascending
    ? { value: numbers, issues: [] }
    : invalid(path, `1 to ${maxBreaks} finite numbers in strictly ascending order`)
}

const scale = (input: unknown, path: Path): Checked<Scale> => {
  if (!isRecord(input)) return invalid(path, "a scale object")

  const at = (key: string) => [...path, key]
  const tint = input["colour"] === undefined ? undefined : colour(input["colour"], at("colour"))
  const tinted = tint?.value === undefined ? {} : { colour: tint.value }

  if (input["kind"] === "quantile") {
    const count = input["classes"]
    const issues = [
      ...keys(path, ["kind", "classes", "colour"])(input),
      ...(tint?.issues ?? []),
      ...(count === undefined || isClasses(count)
        ? []
        : invalid(at("classes"), "3, 4, 5, 6 or 7").issues),
    ]

    return issues.length > 0
      ? { value: undefined, issues }
      : {
          value: { kind: "quantile", ...(isClasses(count) ? { classes: count } : {}), ...tinted },
          issues,
        }
  }

  if (input["kind"] === "breaks") {
    const bands = breaks(input["at"], at("at"))
    const issues = [
      ...keys(path, ["kind", "at", "colour"])(input),
      ...bands.issues,
      ...(tint?.issues ?? []),
    ]

    return issues.length > 0 || bands.value === undefined
      ? { value: undefined, issues }
      : { value: { kind: "breaks", at: bands.value, ...tinted }, issues }
  }

  if (input["kind"] === "diverging") {
    const bands = breaks(input["at"], at("at"))
    const mid = input["mid"]
    const below = colour(input["below"], at("below"))
    const above = colour(input["above"], at("above"))
    const first = bands.value?.[0]
    const last = bands.value?.at(-1)

    const issues = [
      ...keys(path, ["kind", "at", "mid", "below", "above"])(input),
      ...bands.issues,
      ...(isNumber(mid) ? [] : invalid(at("mid"), "a finite number").issues),
      ...(isNumber(mid) && first !== undefined && last !== undefined && (mid < first || mid > last)
        ? invalid(at("mid"), `a number from ${first} to ${last}, so bands fall on both sides of it`)
            .issues
        : []),
      ...below.issues,
      ...above.issues,
      ...(below.value !== undefined &&
      above.value !== undefined &&
      apart(oklch(below.value), oklch(above.value)) < minApart
        ? invalid(at("above"), `a hue at least ${minApart}° away from \`below\``).issues
        : []),
    ]

    return issues.length > 0 ||
      bands.value === undefined ||
      !isNumber(mid) ||
      below.value === undefined ||
      above.value === undefined
      ? { value: undefined, issues }
      : {
          value: {
            kind: "diverging",
            at: bands.value,
            mid,
            below: below.value,
            above: above.value,
          },
          issues,
        }
  }

  return invalid(at("kind"), '"quantile", "breaks" or "diverging"')
}

// A subdivision code where a country code belongs, worded so the caller moves
// it to the key that takes it.
const misplaced = (input: unknown, path: Path, key: string): ReadonlyArray<Issue> =>
  typeof input === "string" && isArea(input)
    ? invalid(path, `a country code; give the subdivision "${input}" in \`${key}\``).issues
    : []

const pair = (input: unknown, path: Path): Checked<Value> => {
  const expected = "a { country, value } or { area, value } object"

  if (!isRecord(input)) return invalid(path, expected)

  const known = keys(path, ["country", "area", "value"])(input)

  if ((input["country"] === undefined) === (input["area"] === undefined))
    return { value: undefined, issues: [...known, ...invalid(path, expected).issues] }

  const moved = misplaced(input["country"], [...path, "country"], "area")
  const code =
    input["area"] === undefined
      ? moved.length > 0
        ? { value: undefined, issues: moved }
        : country(input["country"], [...path, "country"])
      : area(input["area"], [...path, "area"])
  const number = input["value"]
  const issues = [
    ...known,
    ...code.issues,
    ...(isNumber(number) ? [] : invalid([...path, "value"], "a finite number").issues),
  ]

  if (issues.length > 0 || code.value === undefined || !isNumber(number))
    return { value: undefined, issues }

  return {
    value: isArea(code.value)
      ? { area: code.value, value: number }
      : { country: code.value, value: number },
    issues,
  }
}

// Why an area cannot join the areas listed before it: a map draws the areas
// of one country.
const stray = (first: Area | undefined, next: Area, path: Path): ReadonlyArray<Issue> =>
  first === undefined || countryOf(first) === countryOf(next)
    ? []
    : invalid(
        path,
        `an area of ${countryOf(first)}, as the first is: a map draws one country's areas`,
      ).issues

const values = (input: unknown, path: Path): Checked<Values> => {
  if (!Array.isArray(input))
    return invalid(path, "an array of { country, value } or { area, value } objects")

  const issues: Array<Issue> = []
  const byCountry: Array<Extract<Value, { readonly country: Country }>> = []
  const byArea: Array<Extract<Value, { readonly area: Area }>> = []
  // A fill colours countries or areas, as its first value does.
  const mixed = (at: Path, what: string) =>
    invalid(at, `${what}, as the first value names: a fill colours countries or areas, not both`)
      .issues

  for (const [index, each] of input.entries()) {
    const at = path.concat(index)
    const checked = pair(each, at)

    issues.push(...checked.issues)

    const listed = checked.value

    if (listed === undefined) continue

    if ("area" in listed) {
      const where = [...at, "area"]
      const problems =
        byCountry.length > 0
          ? mixed(where, "a country")
          : stray(byArea[0]?.area, listed.area, where)

      if (problems.length > 0) issues.push(...problems)
      else if (byArea.some((other) => other.area === listed.area))
        issues.push(...invalid(where, "an area not listed before").issues)
      else byArea.push(listed)
    } else {
      const where = [...at, "country"]

      if (byArea.length > 0) issues.push(...mixed(where, "an area"))
      else if (byCountry.some((other) => other.country === listed.country))
        issues.push(...invalid(where, "a country not listed before").issues)
      else byCountry.push(listed)
    }
  }

  return { value: issues.length > 0 ? undefined : byArea.length > 0 ? byArea : byCountry, issues }
}

// A highlight's codes: each checked, each listed once, and areas all of one
// country.
const picks = <A extends Country | Area>(
  input: unknown,
  path: Path,
  {
    check,
    expected,
  }: {
    readonly check: (input: unknown, path: Path) => Checked<A>
    readonly expected: string
  },
): Checked<ReadonlyArray<A>> => {
  if (!Array.isArray(input) || input.length === 0) return invalid(path, expected)

  const issues: Array<Issue> = []
  const picked: Array<A> = []

  for (const [index, each] of input.entries()) {
    const at = path.concat(index)
    const code = check(each, at)

    issues.push(...code.issues)

    if (code.value === undefined) continue

    const [first] = picked
    const problems =
      first !== undefined && isArea(first) && isArea(code.value) ? stray(first, code.value, at) : []

    if (problems.length > 0) issues.push(...problems)
    else if (picked.includes(code.value))
      issues.push(...invalid(at, "a code not listed before").issues)
    else picked.push(code.value)
  }

  return { value: issues.length === 0 ? picked : undefined, issues }
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
    const known = keys(path, ["kind", "countries", "areas", "colour"])(input)
    const tint =
      input["colour"] === undefined ? undefined : colour(input["colour"], [...path, "colour"])
    const tinted = tint?.value === undefined ? {} : { colour: tint.value }

    if (input["countries"] !== undefined && input["areas"] !== undefined)
      return {
        value: undefined,
        issues: [...known, ...invalid(path, "either `countries` or `areas`, not both").issues],
      }

    if (input["areas"] !== undefined) {
      const listed = picks(input["areas"], [...path, "areas"], {
        check: area,
        expected: "a non-empty array of subdivision codes",
      })
      const issues = [...known, ...(tint?.issues ?? []), ...listed.issues]

      return issues.length > 0 || listed.value === undefined
        ? { value: undefined, issues }
        : { value: { kind: "highlight", areas: listed.value, ...tinted }, issues }
    }

    const listed = picks(input["countries"], [...path, "countries"], {
      check: (each, at) => {
        const moved = misplaced(each, at, "areas")

        return moved.length > 0 ? { value: undefined, issues: moved } : country(each, at)
      },
      expected: "a non-empty array of country codes",
    })
    const issues = [...known, ...(tint?.issues ?? []), ...listed.issues]

    return issues.length > 0 || listed.value === undefined
      ? { value: undefined, issues }
      : { value: { kind: "highlight", countries: listed.value, ...tinted }, issues }
  }

  return {
    value: undefined,
    issues: [{ kind: "Invalid", path: [...path, "kind"], expected: '"choropleth" or "highlight"' }],
  }
}

// What a fill colours: countries, or the areas of one country. A
// choropleth's in code order, a highlight's in its own order.
export type Named =
  | { readonly kind: "countries"; readonly codes: ReadonlyArray<Country> }
  | { readonly kind: "areas"; readonly country: Country; readonly codes: ReadonlyArray<Area> }

export const named = (input: Fill | undefined): Named => {
  if (input === undefined) return { kind: "countries", codes: [] }

  const pairs: ReadonlyArray<Value> = input.kind === "choropleth" ? input.values : []
  const areas =
    input.kind === "highlight"
      ? "areas" in input
        ? input.areas
        : []
      : pairs.flatMap((each) => ("area" in each ? [each.area] : [])).toSorted()
  const [first] = areas

  if (first !== undefined) return { kind: "areas", country: countryOf(first), codes: areas }

  if (input.kind === "highlight")
    return { kind: "countries", codes: "countries" in input ? input.countries : [] }

  const listed = new Set(pairs.flatMap((each) => ("country" in each ? [each.country] : [])))

  return {
    kind: "countries",
    codes: countries.flatMap(({ code }) => (listed.has(code) ? [code] : [])),
  }
}

// Each country or area the fill names that the sheet does not draw. A fill
// of areas draws only on its country's own sheet.
const placed = (sheet: SheetId, input: Fill): ReadonlyArray<Issue> => {
  const target = named(input)
  const listed: ReadonlyArray<{ readonly code: Country | Area; readonly path: Path }> =
    input.kind === "choropleth"
      ? input.values.map((each: Value, index) => ({
          code: "area" in each ? each.area : each.country,
          path: ["fill", "values", index],
        }))
      : "areas" in input
        ? input.areas.map((code, index) => ({ code, path: ["fill", "areas", index] }))
        : input.countries.map((code, index) => ({ code, path: ["fill", "countries", index] }))
  const framed = new Set<string>(
    target.kind === "countries" ? members(sheet) : sheet === target.country ? target.codes : [],
  )
  const sheets =
    target.kind === "countries"
      ? frames(target.codes)
      : isSheet(target.country)
        ? [target.country]
        : []

  return listed.flatMap(({ code, path }): ReadonlyArray<Issue> =>
    framed.has(code) ? [] : [{ kind: "NotOnSheet", path, code, sheet, sheets }],
  )
}

const flag = (input: unknown, path: Path): Checked<boolean> =>
  typeof input === "boolean"
    ? { value: input, issues: [] }
    : { value: undefined, issues: [{ kind: "Invalid", path, expected: "true or false" }] }

const place = (input: unknown, path: Path): Checked<Place> => {
  if (typeof input === "string" && (input === "world" || isRegion(input)))
    return { value: input, issues: [] }

  if (isRecord(input)) {
    const issues = keys(path, ["country", "insets"])(input)
    const code = country(input["country"], [...path, "country"])
    const insets =
      input["insets"] === undefined ? undefined : flag(input["insets"], [...path, "insets"])
    const all = [...issues, ...code.issues, ...(insets?.issues ?? [])]

    return all.length > 0 || code.value === undefined
      ? { value: undefined, issues: all }
      : {
          value: {
            country: code.value,
            ...(insets?.value === undefined ? {} : { insets: insets.value }),
          },
          issues: [],
        }
  }

  return country(input, path)
}

const list = <A>(
  input: unknown,
  path: Path,
  each: (input: unknown, path: Path) => Checked<A>,
  expected: string,
): Checked<ReadonlyArray<A>> => {
  if (!Array.isArray(input) || input.length === 0)
    return { value: undefined, issues: [{ kind: "Invalid", path, expected }] }

  const checked = input.map((item, index) => each(item, [...path, index]))
  const issues = checked.flatMap((item) => item.issues)
  const items = checked.flatMap((item) => (item.value === undefined ? [] : [item.value]))

  return { value: issues.length === 0 ? items : undefined, issues }
}

const places = (input: unknown, path: Path) =>
  list(
    input,
    path,
    place,
    'a non-empty array of country codes, region ids, "world" or { country, insets }',
  )

const panel = (input: unknown, path: Path): Checked<Panel> => {
  if (!isRecord(input))
    return { value: undefined, issues: [{ kind: "Invalid", path, expected: "a panel object" }] }

  const issues = keys(path, ["places"])(input)
  const listed = places(input["places"], [...path, "places"])
  const all = [...issues, ...listed.issues]

  return all.length > 0 || listed.value === undefined
    ? { value: undefined, issues: all }
    : { value: { places: listed.value }, issues: [] }
}

const layout = (input: Readonly<Record<string, unknown>>, path: Path): Checked<Layout> => {
  const issues: Array<Issue> = [
    ...keys(path, ["scale", "insets", "context", "places", "panels"])(input),
  ]
  const at = (key: string) => [...path, key]
  const optional = <A>(key: string, check: (input: unknown, path: Path) => Checked<A>) => {
    if (input[key] === undefined) return undefined

    const checked = check(input[key], at(key))

    issues.push(...checked.issues)

    return checked.value
  }

  const scaled = optional("scale", (value, where): Checked<"shared" | "fit"> =>
    value === "shared" || value === "fit"
      ? { value, issues: [] }
      : {
          value: undefined,
          issues: [{ kind: "Invalid", path: where, expected: '"shared" or "fit"' }],
        },
  )
  const insets = optional("insets", flag)
  const context = optional("context", flag)
  const listed = optional("places", places)
  const panels = optional("panels", (value, where) =>
    list(value, where, panel, "a non-empty array of panels"),
  )

  if (input["places"] !== undefined && input["panels"] !== undefined)
    issues.push({ kind: "Invalid", path, expected: "either `places` or `panels`, not both" })

  if (issues.length > 0) return { value: undefined, issues }

  const shared = {
    ...(scaled === undefined ? {} : { scale: scaled }),
    ...(insets === undefined ? {} : { insets }),
    ...(context === undefined ? {} : { context }),
  }

  return {
    value:
      panels !== undefined
        ? { ...shared, panels }
        : { ...shared, ...(listed === undefined ? {} : { places: listed }) },
    issues: [],
  }
}

// A key set to null is a key left out: strict structured output, such as
// OpenAI's, writes every key and sets the ones it has no value for to null.
// No field takes null as a value, so reading it as absent loses nothing.
const absent = (input: unknown): unknown => {
  if (Array.isArray(input)) return input.map(absent)
  if (!isRecord(input)) return input

  return Object.fromEntries(
    Object.entries(input).flatMap(([key, each]) => (each === null ? [] : [[key, absent(each)]])),
  )
}

// Reads untrusted input, from a model, a form or a URL, into a spec, or every
// reason it is not one.
export const parse = (raw: unknown): Parsed => {
  const input = absent(raw)

  if (!isRecord(input))
    return { ok: false, issues: [{ kind: "Invalid", path: [], expected: "a spec object" }] }

  const known = keys([], ["sheet", "title", "source", "fill"])(input)
  const sheet = input["sheet"]

  const framing: Checked<SheetId | Layout> =
    sheet === undefined
      ? { value: undefined, issues: [] }
      : typeof sheet === "string" && isSheet(sheet)
        ? { value: sheet, issues: [] }
        : isRecord(sheet)
          ? layout(sheet, ["sheet"])
          : {
              value: undefined,
              issues: [
                {
                  kind: "Invalid",
                  path: ["sheet"],
                  expected:
                    '"world", a region id, the code of a country with its own map, or a layout object',
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

  // A layout draws any country, so only a prebuilt sheet can leave one off;
  // but a layout draws no areas.
  const target = named(filled?.value)
  const off =
    framing.value === undefined || filled?.value === undefined
      ? []
      : typeof framing.value === "string"
        ? placed(framing.value, filled.value)
        : target.kind === "areas"
          ? invalid(
              ["sheet"],
              `the "${target.country}" sheet, or none: a country's areas draw only on its own map`,
            ).issues
          : []

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

// What is wrong, without where.
const explain = (issue: Issue): string => {
  switch (issue.kind) {
    case "Invalid":
      return `expected ${issue.expected}.`
    case "UnknownKey":
      return `unknown key "${issue.key}".`
    case "UnknownCountry":
      return issue.suggestion === undefined
        ? `"${issue.input}" is not a country code. Use ISO 3166-1 alpha-3.`
        : `"${issue.input}" is not a country code. Did you mean "${issue.suggestion}"?`
    case "UnknownArea":
      return issue.suggestion === undefined
        ? `"${issue.input}" is not a subdivision code. Use ISO 3166-2, e.g. "US-CA".`
        : `"${issue.input}" is not a subdivision code. Did you mean "${issue.suggestion}"?`
    case "NoArea": {
      const owner = countryOf(issue.area)

      return isSheet(owner)
        ? `${issue.area} has no area on the "${owner}" sheet.`
        : `${issue.area} has no area on any sheet: ${owner} has no map of its own.`
    }
    case "NotOnSheet":
      return `${issue.code} is not on the "${issue.sheet}" sheet. Sheets that hold every ${isArea(issue.code) ? "area" : "country"}: ${issue.sheets.join(", ")}.`
  }
}

// One line a person or a model can act on.
export const describe = (issue: Issue): string => `${at(issue.path)}: ${explain(issue)}`

// The Standard Schema interface (standardschema.dev), with its JSON Schema
// extension, so the spec plugs into anything that takes one: an MCP server's
// tool input, a form library, a model tool definition. Messages leave out the
// path, which a consumer prints from `path`.
interface Standard<Output> {
  readonly "~standard": {
    readonly version: 1
    readonly vendor: string
    readonly validate: (value: unknown) =>
      | { readonly value: Output; readonly issues?: undefined }
      | {
          readonly issues: ReadonlyArray<{ readonly message: string; readonly path: Path }>
        }
    readonly jsonSchema: {
      readonly input: (options: { readonly target: string }) => Record<string, unknown>
      readonly output: (options: { readonly target: string }) => Record<string, unknown>
    }
    readonly types?: { readonly input: unknown; readonly output: Output }
  }
}

// The schema reads the same in both drafts. Any other target, such as
// OpenAPI 3.0, has no `$defs` or `const`, so it is refused, as the standard
// asks.
const json = ({ target }: { readonly target: string }) => {
  if (target !== "draft-2020-12" && target !== "draft-07")
    throw new Error(`The map spec has no JSON Schema for the "${target}" target.`)

  return schema
}

export const Spec: Standard<Spec> = {
  "~standard": {
    version: 1,
    vendor: "@nicolastoulemont/minimal-map-charts",
    validate: (value) => {
      const parsed = parse(value)

      return parsed.ok
        ? { value: parsed.spec }
        : { issues: parsed.issues.map((issue) => ({ message: explain(issue), path: issue.path })) }
    },
    jsonSchema: { input: json, output: json },
  },
}
