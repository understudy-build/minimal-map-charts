import { describe, expect, it } from "vitest"

import {
  type Area,
  type Country,
  dark,
  describe as explain,
  draw,
  light,
  paint,
  parse,
  sheetIds,
  type Spec,
  svg,
} from "../src/index.ts"
import { drawn, values } from "./values.ts"

const choropleth = (record: Readonly<Partial<Record<Country, number>>>): Spec => ({
  fill: { kind: "choropleth", values: values(record) },
})

const states = (record: Readonly<Record<Area, number>>): Spec => ({
  fill: {
    kind: "choropleth",
    values: Object.entries(record).map(([area, value]) => ({ area: area as Area, value })),
  },
})

// Every area the United States sheet draws, on the map and in its insets.
const everyState = async () => {
  const blank = await drawn({ sheet: "USA" })

  return [...blank.borders, ...blank.insets.flatMap((inset) => inset.borders)].map(
    (border) => border.code as Area,
  )
}

describe("draw", () => {
  it("frames the narrowest region holding every country", async () => {
    const europe = await drawn(choropleth({ FRA: 1, DEU: 2 }))
    const world = await drawn(choropleth({ FRA: 1, USA: 2 }))

    expect([europe.sheet, europe.choice]).toEqual(["europe", "Derived"])
    expect(world.sheet).toBe("world")
  })

  it("draws a country's own map, with its subdivisions and insets, only when asked", async () => {
    const derived = await drawn({ fill: { kind: "highlight", countries: ["FRA"] } })
    const france = await drawn({ sheet: "FRA", fill: { kind: "highlight", countries: ["FRA"] } })

    expect(derived.sheet).toBe("europe")
    expect([france.sheet, france.choice]).toEqual(["FRA", "Given"])
    expect(france.borders.map((border) => border.name)).toContain("Bretagne")
    expect(france.insets.map((inset) => [inset.name, inset.tone])).toContainEqual([
      "Réunion",
      { kind: "accent", colour: undefined },
    ])
  })

  it("picks out highlighted countries in the spec's colour", async () => {
    const scene = await drawn({
      fill: { kind: "highlight", countries: ["FRA"], colour: "#ef6c00" },
    })

    expect(scene.shapes.find((shape) => shape.country === "FRA")?.tone).toEqual({
      kind: "accent",
      colour: "#ef6c00",
    })
  })

  it("shades countries with values and leaves the rest blank", async () => {
    const scene = await drawn(choropleth({ FRA: 1, DEU: 2, ITA: 3, ESP: 4, POL: 5 }))
    const tone = (country: string) => scene.shapes.find((shape) => shape.country === country)?.tone

    expect(tone("FRA")).toEqual({ kind: "shade", strength: 0, colour: undefined })
    expect(tone("POL")).toEqual({ kind: "shade", strength: 1, colour: undefined })
    expect(tone("PRT")).toEqual({ kind: "blank" })
    expect(scene.rows.map((row) => row.country)).toEqual(["POL", "ESP", "ITA", "DEU", "FRA"])
  })

  it("shades a country's areas on its own map, insets included", async () => {
    const scene = await drawn(states({ "US-CA": 39, "US-TX": 29, "US-AK": 0.7 }))
    const alaska = scene.insets.find((inset) => inset.name === "Alaska")

    expect([scene.sheet, scene.choice]).toEqual(["USA", "Derived"])
    expect(scene.patches.map((patch) => [patch.area, patch.label])).toEqual([
      ["US-CA", "California: 39"],
      ["US-TX", "Texas: 29"],
    ])
    expect(alaska?.patches.map((patch) => patch.tone)).toEqual([
      { kind: "shade", strength: 0, colour: undefined },
    ])
    expect(scene.shapes.map((shape) => [shape.country, shape.tone, shape.label])).toEqual([
      ["USA", { kind: "blank" }, "United States"],
    ])
    expect(scene.rows.map((row) => [row.area, row.name, row.value])).toEqual([
      ["US-CA", "California", 39],
      ["US-TX", "Texas", 29],
      ["US-AK", "Alaska", 0.7],
    ])
    expect(scene.legend?.bins.map((bin) => [bin.low, bin.high])).toEqual([
      [0.7, 0.7],
      [29, 29],
      [39, 39],
    ])
    expect(scene.description).toBe("Map of United States: 3 areas shaded in 5 classes.")
  })

  it("picks out highlighted areas and names them", async () => {
    const scene = await drawn({
      title: "Founding regions",
      fill: { kind: "highlight", areas: ["FR-BRE", "FR-IDF"], colour: "#ef6c00" },
    })

    expect(scene.sheet).toBe("FRA")
    expect(scene.patches.map((patch) => [patch.area, patch.tone])).toEqual([
      ["FR-BRE", { kind: "accent", colour: "#ef6c00" }],
      ["FR-IDF", { kind: "accent", colour: "#ef6c00" }],
    ])
    expect(scene.description).toBe(
      "Founding regions. Map of France: Bretagne, Île-de-France highlighted.",
    )
  })

  it("refuses an area its country's sheet does not draw under that code", async () => {
    // The Norway sheet draws Viken's 2024 successors under their source's
    // codes, so NO-30 finds nothing.
    const norway = await draw({ fill: { kind: "highlight", areas: ["NO-11", "NO-30"] } })
    const usa = await draw(states({ "US-CA": 39, "US-ZZ": 1 }))

    expect(norway).toEqual({
      ok: false,
      issues: [{ kind: "NoArea", path: ["fill", "areas", 1], area: "NO-30" }],
    })
    expect(!usa.ok && usa.issues.map(explain)).toEqual([
      'fill.values.1.area: US-ZZ has no area on the "USA" sheet.',
    ])
  })

  it("lists countries too small to draw, and keeps them in the rows", async () => {
    const scene = await drawn(choropleth({ SGP: 3, USA: 2 }))

    expect(scene.missing).toEqual(["SGP"])
    expect(scene.rows.map((row) => row.country)).toEqual(["SGP", "USA"])
  })

  it("names countries and formats values in the requested locale", async () => {
    const scene = await drawn(choropleth({ DEU: 1234.5 }), { locale: "fr" })

    expect(scene.shapes.find((shape) => shape.country === "DEU")?.label).toBe(
      "Allemagne: 1\u202f234,5",
    )
  })

  it("credits the publisher of a sheet's boundaries", async () => {
    const world = await drawn({})
    const uk = await drawn({ sheet: "GBR" })

    expect(world.credits.map((credit) => credit.publisher)).toEqual(["Natural Earth"])
    expect(uk.credits[0]?.license).toBe("Open Government Licence v3.0")
  })

  it("describes the map for assistive technology", async () => {
    const scene = await drawn({
      title: "Members",
      fill: { kind: "highlight", countries: ["FRA", "DEU"] },
    })

    expect(scene.description).toBe("Members. Map of Europe: France, Germany highlighted.")
  })

  it.each(sheetIds)("loads the %s sheet", async (sheet) => {
    const scene = await drawn({ sheet })

    expect(scene.shapes.length).toBeGreaterThan(0)
    expect(scene.width).toBe(1000)
  })
})

describe("svg", () => {
  it("fills the areas a fill names, and shows no data only where an area has none", async () => {
    const codes = await everyState()
    const all = svg(
      await drawn(states(Object.fromEntries(codes.map((code, index) => [code, index])))),
    )
    const some = svg(await drawn(states({ "US-CA": 39 })))

    expect(some).toMatch(
      /data-area="US-CA" fill="#[0-9a-f]{6}" [^>]*><title>California: 39<\/title>/,
    )
    expect(some).toContain("No data")
    expect(all).toMatch(/data-area="US-AK" fill="#[0-9a-f]{6}" [^>]*><title>Alaska: /)
    expect(all).not.toContain("No data")
  })

  it("draws a standalone document with its title, legend and credits", async () => {
    const result = parse({
      title: "Growth <2024>",
      source: "World Bank",
      fill: { kind: "choropleth", values: values({ FRA: 1, DEU: 2 }), better: "higher" },
    })

    if (!result.ok) throw new Error("spec should parse")

    const markup = svg(await drawn(result.spec))

    expect(markup).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    expect(markup).toContain("<title>Growth &lt;2024&gt;</title>")
    expect(markup).toContain('data-country="FRA"')
    expect(markup).toContain("Higher is better")
    expect(markup).toContain("Data: World Bank.")
    expect(markup).toContain("Boundaries: Natural Earth, v5.1.2. Public domain.")
  })

  it("paints its own surface with one palette", async () => {
    const scene = await drawn(choropleth({ FRA: 1, DEU: 2 }))

    for (const palette of [light, dark]) {
      const markup = svg(scene, { palette })

      expect(markup).toMatch(
        new RegExp(`<rect width="1000" height="\\d+" fill="${palette.surface}"/>`),
      )
      expect(markup).not.toContain("light-dark(")
    }
  })

  it("follows the page's colour scheme with a palette for each", async () => {
    const scene = await drawn({
      title: "Growth",
      ...choropleth({ FRA: 1, DEU: 2, ITA: 3, ESP: 4 }),
    })
    const markup = svg(scene, { palette: { light, dark } })
    const colours = [...markup.matchAll(/ (?:fill|stroke)="([^"]*)"/g)].map(
      ([attribute]) => attribute,
    )

    expect(markup).not.toMatch(/<rect width="1000"/)
    expect(markup).toContain('font-weight="600" fill="currentColor">Growth</text>')
    expect(
      colours.filter((colour) => !/="(light-dark\(.*|none|currentColor)"$/.test(colour)),
    ).toEqual([])

    for (const shape of scene.shapes) {
      const pair = `light-dark(${paint(shape.tone, { palette: light })},${paint(shape.tone, { palette: dark })})`

      expect(markup).toContain(`data-country="${shape.country}" fill="${pair}"`)
    }
  })
})
