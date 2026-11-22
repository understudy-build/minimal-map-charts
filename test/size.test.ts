import { describe, expect, it } from "vitest"

import { members } from "../src/frame.ts"
import { dark, light, sheetIds, sheetOf, size, type Spec, svg } from "../src/index.ts"
import { drawn as scene, values } from "./values.ts"

// The viewBox `svg()` writes for a spec, once its sheet has loaded.
const drawn = async (spec: Spec) => {
  const [, , width = 0, height = 0] =
    /viewBox="(\d+) (\d+) (\d+) (\d+)"/
      .exec(svg(await scene(spec), { palette: { light, dark } }))
      ?.slice(1)
      .map(Number) ?? []

  return { width, height }
}

describe("size", () => {
  it("gives every sheet's map the size svg() draws, before the sheet loads", async () => {
    const specs = sheetIds.flatMap((sheet): ReadonlyArray<Spec> => {
      const [first = "FRA", second = first] = members(sheet)

      return [
        { sheet },
        {
          sheet,
          title: "Unemployment, %",
          source: "Eurostat",
          fill: { kind: "choropleth", values: values({ [first]: 1, [second]: 2 }) },
        },
      ]
    })
    const sizes = await Promise.all(specs.map(drawn))

    expect(specs.map((spec) => [spec.sheet, size(spec)])).toEqual(
      specs.map((spec, index) => [spec.sheet, sizes[index]]),
    )
  })

  it("leaves room for the note on countries too small to draw", async () => {
    const spec: Spec = { fill: { kind: "highlight", countries: ["SGP", "BRA"] } }
    const drawable: Spec = { sheet: "world", fill: { kind: "highlight", countries: ["BRA"] } }

    expect(sheetOf(spec)).toBe("world")
    expect(size(spec)).toEqual(await drawn(spec))
    expect(size(spec)?.height).toBeGreaterThan(size(drawable)?.height ?? Infinity)
  })

  it("sizes a derived sheet and a fill of areas as draw() frames them", async () => {
    const derived: Spec = { fill: { kind: "choropleth", values: values({ FRA: 1, DEU: 2 }) } }
    const areas: Spec = { fill: { kind: "highlight", areas: ["US-CA", "US-HI"] } }

    expect([sheetOf(derived), sheetOf(areas)]).toEqual(["europe", "USA"])
    expect(size(derived)).toEqual(await drawn(derived))
    expect(size(areas)).toEqual(await drawn(areas))
  })

  it("knows a layout's size only once drawn", () => {
    expect(size({ sheet: { places: ["USA", "FRA"] } })).toBeUndefined()
  })
})
