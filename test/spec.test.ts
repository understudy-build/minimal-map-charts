import { Ajv } from "ajv"
import { describe as group, expect, it } from "vitest"

import { describe, parse, schema, Spec } from "../src/index.ts"

const validate = new Ajv({ strict: false }).compile(schema)

const choropleth = (values: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  fill: { kind: "choropleth", values, ...extra },
})

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

  it("suggests the code for a name, an alpha-2 code or the wrong case", () => {
    const result = parse({ fill: { kind: "highlight", countries: ["France", "DE", "ita"] } })

    expect(result.ok).toBe(false)
    expect(
      !result.ok &&
        result.issues.map((issue) => issue.kind === "UnknownCountry" && issue.suggestion),
    ).toEqual(["FRA", "DEU", "ITA"])
  })

  it("names the sheets that would hold every country when one is off the given sheet", () => {
    const result = parse({ sheet: "europe", ...choropleth({ FRA: 1, BRA: 2 }) })

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          kind: "NotOnSheet",
          path: ["fill", "values", "BRA"],
          country: "BRA",
          sheet: "europe",
          sheets: ["world"],
        },
      ],
    })
  })

  it("refuses unknown keys, so a typo is not silently ignored", () => {
    const result = parse({ titel: "GDP" })

    expect(!result.ok && result.issues.map(describe)).toEqual(['spec: unknown key "titel".'])
  })

  it("refuses breaks out of order and repeated highlights", () => {
    const breaks = parse(choropleth({ FRA: 1 }, { scale: { kind: "breaks", at: [2, 1] } }))
    const repeated = parse({ fill: { kind: "highlight", countries: ["FRA", "FRA"] } })

    expect(!breaks.ok && breaks.issues.map(describe)).toEqual([
      "fill.scale.at: expected 1 to 6 finite numbers in strictly ascending order.",
    ])
    expect(!repeated.ok && repeated.issues.map(describe)).toEqual([
      "fill.countries.1: expected a code not listed before.",
    ])
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

  it("serves the Standard Schema interface", () => {
    expect(Spec["~standard"].validate({ sheet: "world" })).toEqual({ value: { sheet: "world" } })
    expect(Spec["~standard"].validate({ sheet: "moon" })).toEqual({
      issues: [
        {
          message:
            'sheet: expected "world", a region id, the code of a country with its own map, or a layout object.',
          path: ["sheet"],
        },
      ],
    })
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
    ["places and panels", { sheet: { places: ["USA"], panels: [{ places: ["FRA"] }] } }],
    ["repeated highlight", { fill: { kind: "highlight", countries: ["FRA", "FRA"] } }],
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
  ]

  it.each(cases)("agrees with parse on %s", (_, input) => {
    expect(validate(input)).toBe(parse(input).ok)
  })
})
