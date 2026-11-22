import { describe, expect, it } from "vitest"

import { subdivision } from "../scripts/build-maps/iso.ts"
import { despike, flat, spikes } from "../scripts/build-maps/tidy.ts"
import { uncoded } from "../scripts/build-maps/uncoded.gen.ts"
import { draw, sheetIds } from "../src/index.ts"
import { load, nations, type Steps } from "../src/sheet.ts"

// Every outline a sheet draws, named for the failure message.
const outlines = async (id: (typeof sheetIds)[number]) => {
  const sheet = await load(id)

  return [
    ...Object.entries(sheet.outlines).map(([country, outline]): [string, Steps] => [
      country,
      outline ?? [],
    ]),
    ...(sheet.subdivisions?.areas ?? []).map((area): [string, Steps] => [area.name, area.outline]),
    ...sheet.insets.map((inset): [string, Steps] => [inset.name, inset.outline]),
    ...sheet.insets
      .flatMap((inset) => inset.areas ?? [])
      .map((area): [string, Steps] => [area.name, area.outline]),
  ]
}

describe("sheets", () => {
  it.each(sheetIds)(
    "%s draws no spike, no ring that encloses nothing, and no empty shape",
    async (id) => {
      const shapes = await outlines(id)

      expect(shapes.filter(([, outline]) => outline.some(flat)).map(([name]) => name)).toEqual([])
      expect(
        shapes
          .filter(([, outline]) => outline.some((ring) => spikes(ring) > 0))
          .map(([name]) => name),
      ).toEqual([])
      expect(shapes.filter(([, outline]) => outline.length === 0).map(([name]) => name)).toEqual([])
    },
  )

  it("draws a country too small for a shape as a dot", async () => {
    const scene = await draw({ sheet: "oceania", fill: { kind: "highlight", countries: ["NRU"] } })

    expect(scene.missing).toEqual([])
    expect(scene.shapes.find((shape) => shape.country === "NRU")).toMatchObject({
      tone: { kind: "accent" },
      path: expect.stringMatching(/^M458 192.5a4 4 0 1 0 8 0/),
    })
  })

  it.each(sheetIds)("%s marks only countries it does not draw as shapes", async (id) => {
    const sheet = await load(id)

    expect(Object.keys(sheet.dots ?? {}).filter((code) => code in sheet.outlines)).toEqual([])
  })
})

// The code of every area a national sheet draws, on the map or in an inset.
const codes = async (country: (typeof nations)[number]) => {
  const sheet = await load(country)

  return [
    ...(sheet.subdivisions?.areas ?? []),
    ...sheet.insets.flatMap((inset) => inset.areas ?? []),
  ].map((area) => area.code)
}

describe("subdivisions", () => {
  it.each(nations)("%s codes each area in ISO 3166-2, or lists it as uncoded", async (country) => {
    const outside = (await codes(country)).filter(
      (code) => subdivision(country, code) === undefined,
    )

    expect(outside.toSorted()).toEqual((uncoded[country] ?? []).toSorted())
  })

  it.each(nations)("%s gives no two areas the same code", async (country) => {
    const all = await codes(country)

    expect(all.filter((code, index) => all.indexOf(code) !== index)).toEqual([])
  })
})

describe("despike", () => {
  it("removes an outline that goes out to a point and straight back", () => {
    // A square with a spike out of its top-right corner.
    const spiked = [0, 0, 10, 0, 5, 5, -5, -5, 0, 10, -10, 0]

    expect(spikes(spiked)).toBe(1)
    expect(despike(spiked)).toEqual([0, 0, 10, 0, 0, 10, -10, 0])
  })
})

describe("flat", () => {
  it("finds a ring that only folds back on itself", () => {
    expect(flat([0, 0, 5, 0, 3, 0, -3, 0, -5, 0])).toBe(true)
    expect(flat([0, 0, 5, 0, 0, 5, -5, -5])).toBe(false)
  })
})
