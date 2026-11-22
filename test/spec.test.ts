import { Ajv } from "ajv"
import { Ajv2020 } from "ajv/dist/2020.js"
import { describe as group, expect, it } from "vitest"

import { describe, parse, schema, Spec, strict } from "../src/index.ts"

const validate = new Ajv({ strict: false }).compile(schema)

// Values written as a record for brevity, sent as the spec's pairs.
const choropleth = (values: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  fill: {
    kind: "choropleth",
    values: Object.entries(values).map(([country, value]) => ({ country, value })),
    ...extra,
  },
})

// Area values written as a record, as `choropleth` writes countries'.
const states = (values: Record<string, unknown>) => ({
  fill: {
    kind: "choropleth",
    values: Object.entries(values).map(([area, value]) => ({ area, value })),
  },
})

const refused = (input: unknown) => {
  const result = parse(input)

  return !result.ok && result.issues.map(describe)
}

const issues = (scale: Record<string, unknown>) => {
  const result = parse(choropleth({ FRA: 1 }, { scale }))

  return !result.ok && result.issues.map(describe)
}

group("parse", () => {
  it("accepts an empty spec, which draws the world", () => {
    expect(parse({})).toEqual({ ok: true, spec: {} })
  })

  it("accepts a full choropleth", () => {
    const input = {
      sheet: "europe",
      title: "GDP growth, 2024",
      source: "World Bank",
      ...choropleth(
        { FRA: 1.1, DEU: -0.2 },
        { scale: { kind: "breaks", at: [0, 1] }, better: "higher" },
      ),
    }

    expect(parse(input)).toEqual({ ok: true, spec: input })
  })

  it("accepts the areas of one country, on its own sheet or with none", () => {
    const shaded = { sheet: "USA", source: "U.S. Census Bureau", ...states({ "US-CA": 39 }) }
    const picked = { fill: { kind: "highlight", areas: ["FR-IDF", "FR-BRE"] } }

    expect(parse(shaded)).toEqual({ ok: true, spec: shaded })
    expect(parse(picked)).toEqual({ ok: true, spec: picked })
  })

  it("suggests the code for a name, an alpha-2 code or the wrong case", () => {
    const result = parse({ fill: { kind: "highlight", countries: ["France", "DE", "ita"] } })
    const areas = parse({ fill: { kind: "highlight", areas: ["us-ca", "USA-TX", "US.NY"] } })

    expect(result.ok).toBe(false)
    expect(
      !result.ok &&
        result.issues.map((issue) => issue.kind === "UnknownCountry" && issue.suggestion),
    ).toEqual(["FRA", "DEU", "ITA"])
    expect(
      !areas.ok && areas.issues.map((issue) => issue.kind === "UnknownArea" && issue.suggestion),
    ).toEqual(["US-CA", "US-TX", "US-NY"])
  })

  it("moves a subdivision given as a country to the key that takes it", () => {
    expect(refused({ sheet: "USA", ...choropleth({ "US-CA": 39 }) })).toEqual([
      'fill.values.0.country: expected a country code; give the subdivision "US-CA" in `area`.',
    ])
    expect(refused({ fill: { kind: "highlight", countries: ["FR-IDF"] } })).toEqual([
      'fill.countries.0: expected a country code; give the subdivision "FR-IDF" in `areas`.',
    ])
  })

  it("refuses an area its country's sheet does not draw under that code", () => {
    // The Norway sheet draws Viken's 2024 successors under their source's
    // codes, so NO-30 finds nothing.
    expect(
      refused({ fill: { kind: "highlight", areas: ["NO-30", "US-ZZ", "California"] } }),
    ).toEqual([
      'fill.areas.0: NO-30 has no area on the "NOR" sheet.',
      'fill.areas.1: US-ZZ has no area on the "USA" sheet.',
      'fill.areas.2: "California" is not a subdivision code. Use ISO 3166-2, e.g. "US-CA".',
    ])
  })

  it("refuses a fill that mixes countries and areas, or areas of two countries", () => {
    expect(
      refused({
        fill: {
          kind: "choropleth",
          values: [
            { area: "US-CA", value: 1 },
            { country: "FRA", value: 2 },
            { area: "FR-IDF", value: 3 },
          ],
        },
      }),
    ).toEqual([
      "fill.values.1.country: expected an area, as the first value names: a fill colours countries or areas, not both.",
      "fill.values.2.area: expected an area of USA, as the first is: a map draws one country's areas.",
    ])
    expect(refused({ fill: { kind: "highlight", countries: ["FRA"], areas: ["FR-IDF"] } })).toEqual(
      ["fill: expected either `countries` or `areas`, not both."],
    )
  })

  it("names the sheets that would hold every country when one is off the given sheet", () => {
    const result = parse({ sheet: "europe", ...choropleth({ FRA: 1, BRA: 2 }) })

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          kind: "NotOnSheet",
          path: ["fill", "values", 1],
          code: "BRA",
          sheet: "europe",
          sheets: ["world"],
        },
      ],
    })
  })

  it("names the sheet that holds the areas when another sheet is given", () => {
    expect(refused({ sheet: "FRA", ...states({ "US-CA": 39 }) })).toEqual([
      'fill.values.0: US-CA is not on the "FRA" sheet. Sheets that hold every area: USA.',
    ])
    expect(
      refused({ sheet: { places: ["USA"] }, fill: { kind: "highlight", areas: ["US-CA"] } }),
    ).toEqual([
      'sheet: expected the "USA" sheet, or none: a country\'s areas draw only on its own map.',
    ])
  })

  it("refuses unknown keys, so a typo is not silently ignored", () => {
    const result = parse({ titel: "GDP" })

    expect(!result.ok && result.issues.map(describe)).toEqual(['spec: unknown key "titel".'])
  })

  it("refuses breaks out of order and countries listed twice", () => {
    const breaks = parse(choropleth({ FRA: 1 }, { scale: { kind: "breaks", at: [2, 1] } }))
    const repeated = parse({ fill: { kind: "highlight", countries: ["FRA", "FRA"] } })
    const twice = parse({
      fill: {
        kind: "choropleth",
        values: [
          { country: "FRA", value: 1 },
          { country: "FRA", value: 2 },
        ],
      },
    })

    expect(!breaks.ok && breaks.issues.map(describe)).toEqual([
      "fill.scale.at: expected 1 to 6 finite numbers in strictly ascending order.",
    ])
    expect(!repeated.ok && repeated.issues.map(describe)).toEqual([
      "fill.countries.1: expected a code not listed before.",
    ])
    expect(!twice.ok && twice.issues.map(describe)).toEqual([
      "fill.values.1.country: expected a country not listed before.",
    ])
  })

  it("names the pair a wrong code or value sits in", () => {
    const result = parse(choropleth({ France: 1, DEU: "2" }))

    expect(!result.ok && result.issues.map(describe)).toEqual([
      'fill.values.0.country: "France" is not a country code. Did you mean "FRA"?',
      "fill.values.1.value: expected a finite number.",
    ])
  })

  it("reads a key set to null as left out, as strict structured output writes it", () => {
    const input = {
      sheet: null,
      title: "GDP growth",
      source: null,
      fill: {
        kind: "choropleth",
        values: [{ country: "FRA", value: 1 }],
        scale: null,
        better: null,
      },
    }

    expect(parse(input)).toEqual({
      ok: true,
      spec: {
        title: "GDP growth",
        fill: { kind: "choropleth", values: [{ country: "FRA", value: 1 }] },
      },
    })
  })

  it("accepts colours for a scale and a highlight", () => {
    const diverging = choropleth(
      { FRA: 1.1, DEU: -0.2 },
      { scale: { kind: "diverging", at: [-1, 1], mid: 0, below: "#c62828", above: "#1565c0" } },
    )
    const highlight = { fill: { kind: "highlight", countries: ["FRA"], colour: "#EF6C00" } }

    expect(parse(diverging)).toEqual({ ok: true, spec: diverging })
    expect(parse(highlight)).toEqual({ ok: true, spec: highlight })
  })

  it("refuses colours that cannot show a scale", () => {
    expect(issues({ kind: "quantile", colour: "green" })).toEqual([
      'fill.scale.colour: expected a colour as "#rrggbb".',
    ])
    expect(issues({ kind: "breaks", at: [1], colour: "#777777" })).toEqual([
      "fill.scale.colour: expected a colour with a hue, not a grey.",
    ])
    expect(
      issues({ kind: "diverging", at: [0, 2], mid: 5, below: "#c62828", above: "#ef6c00" }),
    ).toEqual([
      "fill.scale.mid: expected a number from 0 to 2, so bands fall on both sides of it.",
      "fill.scale.above: expected a hue at least 60° away from `below`.",
    ])
  })

  it("serves the Standard Schema interface, with the path apart from the message", () => {
    expect(Spec["~standard"].validate({ sheet: "world" })).toEqual({ value: { sheet: "world" } })
    expect(Spec["~standard"].validate({ sheet: "moon" })).toEqual({
      issues: [
        {
          message:
            'expected "world", a region id, the code of a country with its own map, or a layout object.',
          path: ["sheet"],
        },
      ],
    })
  })

  it("serves its JSON Schema through the Standard JSON Schema interface", () => {
    const { jsonSchema } = Spec["~standard"]

    expect(jsonSchema.input({ target: "draft-2020-12" })).toBe(schema)
    expect(jsonSchema.output({ target: "draft-07" })).toBe(schema)
    expect(() => jsonSchema.input({ target: "openapi-3.0" })).toThrow(/openapi-3.0/)
  })
})

group("JSON Schema", () => {
  const cases: ReadonlyArray<readonly [string, unknown]> = [
    ["empty", {}],
    ["choropleth", choropleth({ FRA: 1, DEU: 2 }, { scale: { kind: "quantile", classes: 4 } })],
    ["highlight", { sheet: "FRA", fill: { kind: "highlight", countries: ["FRA"] } }],
    ["unknown key", { colour: "red" }],
    ["unknown country", choropleth({ XYZ: 1 })],
    ["text value", choropleth({ FRA: "1" })],
    ["bad classes", choropleth({ FRA: 1 }, { scale: { kind: "quantile", classes: 9 } })],
    ["unknown sheet", { sheet: "moon" }],
    ["empty highlight", { fill: { kind: "highlight", countries: [] } }],
    [
      "layout",
      {
        sheet: { scale: "fit", places: ["USA", "europe", { country: "FRA", insets: false }] },
      },
    ],
    [
      "layout panels",
      {
        sheet: { context: false, panels: [{ places: ["USA"] }, { places: ["FRA"] }] },
      },
    ],
    ["projection", { sheet: { projection: "mercator" } }],
    ["unknown place", { sheet: { places: ["atlantis"] } }],
    [
      "diverging",
      choropleth(
        { FRA: 1 },
        { scale: { kind: "diverging", at: [0], mid: 0, below: "#c62828", above: "#1565c0" } },
      ),
    ],
    [
      "diverging without colours",
      choropleth({ FRA: 1 }, { scale: { kind: "diverging", at: [0], mid: 0 } }),
    ],
    ["named colour", choropleth({ FRA: 1 }, { scale: { kind: "quantile", colour: "green" } })],
    ["highlight colour", { fill: { kind: "highlight", countries: ["FRA"], colour: "#ef6c00" } }],
    ["area choropleth", states({ "US-CA": 39, "US-TX": 29 })],
    ["area highlight", { fill: { kind: "highlight", areas: ["FR-IDF"], colour: "#ef6c00" } }],
    ["area in lower case", { fill: { kind: "highlight", areas: ["fr-idf"] } }],
    [
      "countries and areas",
      {
        fill: {
          kind: "choropleth",
          values: [
            { area: "US-CA", value: 1 },
            { country: "FRA", value: 2 },
          ],
        },
      },
    ],
    [
      "countries and areas in a highlight",
      {
        fill: { kind: "highlight", countries: ["FRA"], areas: ["FR-IDF"] },
      },
    ],
  ]

  const later = new Ajv2020({ strict: false }).compile(schema)

  it.each(cases)("agrees with parse on %s", (_, input) => {
    expect(validate(input)).toBe(parse(input).ok)
    expect(later(input)).toBe(parse(input).ok)
  })

  // Rules no strict structured output can state; `parse` alone holds them.
  it.each<readonly [string, unknown]>([
    ["places and panels", { sheet: { places: ["USA"], panels: [{ places: ["FRA"] }] } }],
    ["repeated highlight", { fill: { kind: "highlight", countries: ["FRA", "FRA"] } }],
    [
      "repeated value",
      {
        fill: {
          kind: "choropleth",
          values: [
            { country: "FRA", value: 1 },
            { country: "FRA", value: 2 },
          ],
        },
      },
    ],
    ["an area its sheet lacks", { fill: { kind: "highlight", areas: ["US-ZZ"] } }],
    ["areas of two countries", { fill: { kind: "highlight", areas: ["US-CA", "FR-IDF"] } }],
  ])("leaves %s to parse", (_, input) => {
    expect([validate(input), parse(input).ok]).toEqual([true, false])
  })
})

group("strict JSON Schema", () => {
  const validateStrict = new Ajv2020({ strict: false }).compile(strict)

  // What strict structured output writes: every key, null where there is none.
  const full = {
    sheet: null,
    title: "Euro area members",
    source: null,
    fill: { kind: "highlight", countries: ["FRA", "DEU"], colour: null },
  }

  it("takes every key, with null for the ones left out, and parse reads the same spec", () => {
    expect(validateStrict(full)).toBe(true)
    expect(parse(full)).toEqual({
      ok: true,
      spec: { title: "Euro area members", fill: { kind: "highlight", countries: ["FRA", "DEU"] } },
    })
  })

  it("takes a highlight of areas, with null for its colour", () => {
    const areas = {
      ...full,
      title: "The West Coast",
      fill: { kind: "highlight", areas: ["US-CA", "US-OR", "US-WA"], colour: null },
    }

    expect(validateStrict(areas)).toBe(true)
    expect(parse(areas)).toEqual({
      ok: true,
      spec: {
        title: "The West Coast",
        fill: { kind: "highlight", areas: ["US-CA", "US-OR", "US-WA"] },
      },
    })
  })

  it("requires every key, so a strict model cannot leave one out", () => {
    const { source: _, ...missing } = full

    expect(validateStrict(missing)).toBe(false)
  })

  it("lists every property as required, all the way down", () => {
    const objects: Array<Record<string, unknown>> = []
    const visit = (node: unknown) => {
      if (Array.isArray(node)) node.forEach(visit)
      else if (typeof node === "object" && node !== null) {
        const record = node as Record<string, unknown>

        if (typeof record["properties"] === "object") objects.push(record)
        Object.values(record).forEach(visit)
      }
    }

    visit(strict)

    expect(objects.length).toBeGreaterThan(5)
    for (const object of objects)
      expect(object["required"]).toEqual(Object.keys(object["properties"] as object))
  })
})
