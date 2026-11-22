import { describe, expect, it } from "vitest"

import { landmarks } from "../scripts/build-maps/borders.ts"
import { subdivision } from "../scripts/build-maps/iso.ts"
import { despike, flat, spikes } from "../scripts/build-maps/tidy.ts"
import { uncoded } from "../scripts/build-maps/uncoded.gen.ts"
import type { Country } from "../src/countries.ts"
import { globe } from "../src/data/globe.gen.ts"
import { sheetIds } from "../src/index.ts"
import { project } from "../src/project.ts"
import { load, nations, type Steps } from "../src/sheet.ts"
import { placed } from "./places.gen.ts"
import { drawn } from "./values.ts"

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
    const scene = await drawn({ sheet: "oceania", fill: { kind: "highlight", countries: ["NRU"] } })

    expect(scene.missing).toEqual([])
    expect(scene.shapes.find((shape) => shape.country === "NRU")).toMatchObject({
      tone: { kind: "accent" },
      path: expect.stringMatching(/^M458 192.5a4 4 0 1 0 8 0/),
    })
  })

  it.each(sheetIds)("%s places each landmark where the build projected it", async (id) => {
    const sheet = await load(id)
    // The build records each landmark to a tenth of a unit.
    const off = Object.entries(placed[id] ?? {}).flatMap(([name, [x, y]]) => {
      const at = landmarks[name]
      const spot = at === undefined ? undefined : project(sheet.projection, at)

      return spot !== undefined && Math.abs(spot[0] - x) <= 0.06 && Math.abs(spot[1] - y) <= 0.06
        ? []
        : [`${name}: ${spot?.join(", ") ?? "nowhere"} for ${x}, ${y}`]
    })

    expect(off).toEqual([])
  })

  it.each(sheetIds)("%s marks only countries it does not draw as shapes", async (id) => {
    const sheet = await load(id)

    expect(Object.keys(sheet.dots ?? {}).filter((code) => code in sheet.outlines)).toEqual([])
  })
})

// The code of every area a national sheet draws, on the map or in an inset.
// An inset that zooms in on an area of the map draws that same area again.
const codes = async (country: (typeof nations)[number]) => {
  const sheet = await load(country)
  const mapped = sheet.subdivisions?.areas ?? []
  const zoomed = (area: (typeof mapped)[number]) =>
    mapped.some((each) => each.code === area.code && each.name === area.name)

  return [
    ...mapped,
    ...sheet.insets.flatMap((inset) => inset.areas ?? []).filter((area) => !zoomed(area)),
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

// Who holds each landmark in scripts/build-maps/borders.ts, as the README's
// "Borders" section says; null for land of no country.
const holders: Readonly<Record<string, Country | null>> = {
  Simferopol: "UKR",
  Donetsk: "UKR",
  Katzrin: "SYR",
  Kyrenia: "CYP",
  Hargeisa: "SOM",
  Abkhazia: "GEO",
  Tskhinvali: "GEO",
  Rîbnița: "MDA",
  Stepanakert: "AZE",
  Baikonur: "KAZ",
  Pristina: "XKX",
  Ramallah: "PSE",
  Srinagar: "IND",
  Siachen: "IND",
  Itanagar: "IND",
  Gilgit: "PAK",
  Muzaffarabad: "PAK",
  "Aksai Chin": "CHN",
  "Hala'ib": "EGY",
  "Kafia Kingi": "SDN",
  "Ilemi, south": "KEN",
  "Ilemi, north": "KEN",
  Laayoune: null,
  Tifariti: null,
  Abyei: null,
  "Bir Tawil": null,
  Taipei: null,
  "East Falkland": null,
}

// Places a national sheet's main outline leaves out although its country
// holds them: Natural Earth's Admin 1 draws no Siachen in India, and
// Moldova's sheet draws Transnistria beside the map, as context its
// statistics leave out.
const absent: Readonly<Record<string, ReadonlyArray<string>>> = {
  IND: ["Siachen"],
  MDA: ["Rîbnița"],
}

// Whether a point lies inside an outline, by the even-odd rule over its rings.
const inside = (outline: Steps, [x, y]: readonly [number, number]) => {
  let crossings = 0

  for (const ring of outline) {
    const points: Array<readonly [number, number]> = []

    for (let index = 0; index + 1 < ring.length; index += 2) {
      const [px, py] = points.at(-1) ?? [0, 0]

      points.push([px + (ring[index] ?? 0), py + (ring[index + 1] ?? 0)])
    }

    for (const [index, [x0, y0]] of points.entries()) {
      const [x1, y1] = points[(index + 1) % points.length] ?? [x0, y0]

      if (y0 > y !== y1 > y && x < x0 + ((y - y0) / (y1 - y0)) * (x1 - x0)) crossings++
    }
  }

  return crossings % 2 === 1
}

describe("borders", () => {
  it.each(sheetIds)(
    "%s draws each disputed place in its holder and no other country",
    async (id) => {
      const sheet = await load(id)

      const wrong = Object.entries(placed[id] ?? {}).flatMap(([name, point]) => {
        const holder = holders[name]
        const held = Object.entries(sheet.outlines)
          .filter(([, outline]) => inside(outline ?? [], point))
          .map(([country]) => country)
        const expected =
          holder !== null &&
          holder !== undefined &&
          holder in sheet.outlines &&
          !(absent[id] ?? []).includes(name)
            ? [holder]
            : []

        return held.join() === expected.join() ? [] : [`${name}: ${held.join() || "none"}`]
      })

      expect(wrong).toEqual([])
    },
  )

  it("draws land of no country as land on the world sheet, not as a hole", async () => {
    const sheet = await load("world")

    const holes = Object.entries(placed["world"] ?? {})
      .filter(([name, point]) => holders[name] === null && !inside(sheet.land, point))
      .map(([name]) => name)

    expect(holes).toEqual([])
  })

  it("gives globe Crimea in Ukraine and Western Sahara outside Morocco", () => {
    expect(globe.UKR?.box[1]).toBeLessThan(44.5)
    expect(globe.MAR?.box[1]).toBeGreaterThan(27.6)
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
