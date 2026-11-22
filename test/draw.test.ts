import { describe, expect, it } from "vitest"

import {
  type Country,
  dark,
  draw,
  light,
  paint,
  parse,
  sheetIds,
  type Spec,
  svg,
} from "../src/index.ts"
import { values } from "./values.ts"

const choropleth = (record: Readonly<Partial<Record<Country, number>>>): Spec => ({
  fill: { kind: "choropleth", values: values(record) },
})

describe("draw", () => {
  it("frames the narrowest region holding every country", async () => {
    const europe = await draw(choropleth({ FRA: 1, DEU: 2 }))
    const world = await draw(choropleth({ FRA: 1, USA: 2 }))

    expect([europe.sheet, europe.choice]).toEqual(["europe", "Derived"])
    expect(world.sheet).toBe("world")
  })

  it("draws a country's own map, with its subdivisions and insets, only when asked", async () => {
    const derived = await draw({ fill: { kind: "highlight", countries: ["FRA"] } })
    const france = await draw({ sheet: "FRA", fill: { kind: "highlight", countries: ["FRA"] } })

    expect(derived.sheet).toBe("europe")
    expect([france.sheet, france.choice]).toEqual(["FRA", "Given"])
    expect(france.borders.map((border) => border.name)).toContain("Bretagne")
    expect(france.insets.map((inset) => [inset.name, inset.tone])).toContainEqual([
      "Réunion",
      { kind: "accent", colour: undefined },
    ])
  })

  it("picks out highlighted countries in the spec's colour", async () => {
    const scene = await draw({
      fill: { kind: "highlight", countries: ["FRA"], colour: "#ef6c00" },
    })

    expect(scene.shapes.find((shape) => shape.country === "FRA")?.tone).toEqual({
      kind: "accent",
      colour: "#ef6c00",
    })
  })

  it("shades countries with values and leaves the rest blank", async () => {
    const scene = await draw(choropleth({ FRA: 1, DEU: 2, ITA: 3, ESP: 4, POL: 5 }))
    const tone = (country: string) => scene.shapes.find((shape) => shape.country === country)?.tone

    expect(tone("FRA")).toEqual({ kind: "shade", strength: 0, colour: undefined })
    expect(tone("POL")).toEqual({ kind: "shade", strength: 1, colour: undefined })
    expect(tone("PRT")).toEqual({ kind: "blank" })
    expect(scene.rows.map((row) => row.country)).toEqual(["POL", "ESP", "ITA", "DEU", "FRA"])
  })

  it("lists countries too small to draw, and keeps them in the rows", async () => {
    const scene = await draw(choropleth({ SGP: 3, USA: 2 }))

    expect(scene.missing).toEqual(["SGP"])
    expect(scene.rows.map((row) => row.country)).toEqual(["SGP", "USA"])
  })

  it("names countries and formats values in the requested locale", async () => {
    const scene = await draw(choropleth({ DEU: 1234.5 }), { locale: "fr" })

    expect(scene.shapes.find((shape) => shape.country === "DEU")?.label).toBe(
      "Allemagne: 1\u202f234,5",
    )
  })

  it("credits the publisher of a sheet's boundaries", async () => {
    const world = await draw({})
    const uk = await draw({ sheet: "GBR" })

    expect(world.credits.map((credit) => credit.publisher)).toEqual(["Natural Earth"])
    expect(uk.credits[0]?.license).toBe("Open Government Licence v3.0")
  })

  it("describes the map for assistive technology", async () => {
    const scene = await draw({
      title: "Members",
      fill: { kind: "highlight", countries: ["FRA", "DEU"] },
    })

    expect(scene.description).toBe("Members. Map of Europe: France, Germany highlighted.")
  })

  it.each(sheetIds)("loads the %s sheet", async (sheet) => {
    const scene = await draw({ sheet })

    expect(scene.shapes.length).toBeGreaterThan(0)
    expect(scene.width).toBe(1000)
  })
})

describe("svg", () => {
  it("draws a standalone document with its title, legend and credits", async () => {
    const result = parse({
      title: "Growth <2024>",
      source: "World Bank",
      fill: { kind: "choropleth", values: values({ FRA: 1, DEU: 2 }), better: "higher" },
    })

    if (!result.ok) throw new Error("spec should parse")

    const markup = svg(await draw(result.spec))

    expect(markup).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    expect(markup).toContain("<title>Growth &lt;2024&gt;</title>")
    expect(markup).toContain('data-country="FRA"')
    expect(markup).toContain("Higher is better")
    expect(markup).toContain("Data: World Bank.")
    expect(markup).toContain("Boundaries: Natural Earth, v5.1.2. Public domain.")
  })

  it("paints its own surface with one palette", async () => {
    const scene = await draw(choropleth({ FRA: 1, DEU: 2 }))

    for (const palette of [light, dark]) {
      const markup = svg(scene, { palette })

      expect(markup).toMatch(
        new RegExp(`<rect width="1000" height="\\d+" fill="${palette.surface}"/>`),
      )
      expect(markup).not.toContain("light-dark(")
    }
  })

  it("follows the page's colour scheme with a palette for each", async () => {
    const scene = await draw({
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
