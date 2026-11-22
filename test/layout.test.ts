import { describe, expect, it } from "vitest"

import { describe as explain, draw, type Layout, parse, type Spec } from "../src/index.ts"
import { values } from "./values.ts"

// A choropleth of the United States and Western Europe, laid out as given.
const comparison = (sheet: Layout = {}): Spec => ({
  sheet,
  fill: {
    kind: "choropleth",
    values: values({
      USA: 2.8,
      GBR: 1.1,
      FRA: 1.1,
      ESP: 3.2,
      BEL: 1,
      NLD: 0.9,
      LUX: 0.4,
      DEU: -0.2,
      ITA: 0.7,
    }),
  },
})

const shape = (scene: Awaited<ReturnType<typeof draw>>, country: string) =>
  scene.shapes.find((each) => each.country === country)

const insets = async (sheet: Layout) =>
  (await draw(comparison(sheet))).insets.map((each) => [each.name, each.tone.kind])

describe("layouts", () => {
  it("splits countries an ocean apart into panels side by side", async () => {
    const scene = await draw(comparison())
    const [left, right] = scene.panels

    expect(scene.panels).toHaveLength(2)
    expect(left && right && left.x + left.width <= right.x).toBe(true)
    expect(right && right.x + right.width).toBeLessThanOrEqual(scene.width)
    expect(scene.missing).toEqual([])
  })

  it("keeps countries in one frame when one panel lists them", async () => {
    const scene = await draw(comparison({ panels: [{ places: ["USA", "europe"] }] }))

    expect(scene.panels).toHaveLength(1)
    expect(shape(scene, "USA")).toBeDefined()
    expect(shape(scene, "DEU")).toBeDefined()
  })

  it("draws a kilometre as long in every panel unless asked to fit them", async () => {
    const shared = await draw(comparison({ places: ["USA", "FRA"] }))
    const fit = await draw(comparison({ places: ["USA", "FRA"], scale: "fit" }))
    const heights = (scene: typeof shared) => scene.panels.map((panel) => Math.round(panel.height))

    // France spans about 1,100 km north to south; the United States, Alaska
    // included, about 5,100 km.
    const [usa = 0, france = 0] = heights(shared)

    expect(france / usa).toBeGreaterThan(0.15)
    expect(france / usa).toBeLessThan(0.25)
    expect(new Set(heights(fit)).size).toBe(1)
  })

  it("keeps the insets a sheet draws for a country unless told not to", async () => {
    expect(await insets({ places: ["FRA", "ESP"] })).toEqual([
      ["Guadeloupe", "shade"],
      ["Martinique", "shade"],
      ["French Guiana", "shade"],
      ["Réunion", "shade"],
      ["Mayotte", "shade"],
      ["Canaries", "shade"],
    ])
    expect(await insets({ places: [{ country: "FRA", insets: false }, "ESP"] })).toEqual([
      ["Canaries", "shade"],
    ])
    expect(await insets({ places: ["FRA", "ESP"], insets: false })).toEqual([])
  })

  it("draws neighbours as context, apart from the countries it is about", async () => {
    const scene = await draw({ sheet: { places: ["FRA", "DEU"] } })
    const bare = await draw({ sheet: { places: ["FRA", "DEU"], context: false } })

    expect(shape(scene, "FRA")?.tone).toEqual({ kind: "blank" })
    expect(shape(scene, "CHE")?.tone).toEqual({ kind: "context" })
    expect(bare.shapes.map((each) => each.country)).toEqual(["DEU", "FRA"])
    expect(bare.land).toBe("")
  })

  it("draws a country too small for a shape as a dot", async () => {
    const scene = await draw({
      sheet: { places: ["CHN", "MAC"] },
      fill: { kind: "highlight", countries: ["MAC"] },
    })

    expect(shape(scene, "MAC")?.path).toMatch(/a\d/)
    expect(scene.missing).toEqual([])
  })

  it("lists countries in the fill that fall outside every panel", async () => {
    const scene = await draw(comparison({ places: ["USA"] }))

    expect(scene.missing).toEqual(["BEL", "DEU", "ESP", "FRA", "GBR", "ITA", "LUX", "NLD"])
  })

  it("keeps the world in one panel", async () => {
    const scene = await draw({ sheet: { places: ["world"] } })

    expect(scene.panels).toHaveLength(1)
    expect(shape(scene, "NZL")?.tone).toEqual({ kind: "blank" })
  })

  it("describes the countries a layout is about", async () => {
    const scene = await draw({ sheet: { places: ["USA", "FRA"] } })

    expect(scene.description).toBe("Map of United States and France: countries.")
  })
})

describe("parse layouts", () => {
  it("accepts a layout a model writes", () => {
    const input = {
      sheet: {
        scale: "fit",
        insets: false,
        context: false,
        places: ["USA", "europe", { country: "FRA", insets: true }],
      },
    }

    expect(parse(input)).toEqual({ ok: true, spec: input })
  })

  it("names every problem in a layout", () => {
    const parsed = parse({
      sheet: {
        projection: "mercator",
        places: ["France", { country: "DEU", insets: "no" }],
        panels: [{ places: [] }],
      },
    })

    expect(!parsed.ok && parsed.issues.map(explain)).toEqual([
      'sheet: unknown key "projection".',
      'sheet.places.0: "France" is not a country code. Did you mean "FRA"?',
      "sheet.places.1.insets: expected true or false.",
      'sheet.panels.0.places: expected a non-empty array of country codes, region ids, "world" or { country, insets }.',
      "sheet: expected either `places` or `panels`, not both.",
    ])
  })

  it("lets a layout colour countries a prebuilt sheet would refuse", () => {
    expect(
      parse({ sheet: { places: ["FRA"] }, fill: { kind: "highlight", countries: ["USA"] } }).ok,
    ).toBe(true)
  })
})
