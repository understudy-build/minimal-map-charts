import { describe, expect, it } from "vitest"

import { oklch } from "../src/colour.ts"
import { dark, light, type Palette, paint, type Tone } from "../src/index.ts"

const green = "#2e7d32"
const shade = (strength: number): Tone => ({ kind: "shade", strength, colour: green })
const ramp = (palette: Palette) =>
  [0, 0.5, 1].map((strength) => oklch(paint(shade(strength), { palette })))

describe("paint", () => {
  it("keeps the spec's hue in both palettes", () => {
    const hue = oklch(green).h

    for (const colour of [...ramp(light), ...ramp(dark)])
      expect(Math.abs(colour.h - hue)).toBeLessThan(3)
  })

  it("puts the lowest values nearest the surface in both palettes", () => {
    const [low = 0, mid = 0, high = 0] = ramp(light).map((colour) => colour.l)
    const [dimLow = 0, dimMid = 0, dimHigh = 0] = ramp(dark).map((colour) => colour.l)

    expect(low).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(high)
    expect(dimLow).toBeLessThan(dimMid)
    expect(dimMid).toBeLessThan(dimHigh)
    expect(low).toBeCloseTo(light.lightness.near, 2)
    expect(dimLow).toBeCloseTo(dark.lightness.near, 2)
  })

  it("falls back to the palette's colour", () => {
    const hue = oklch(light.colour).h

    expect(oklch(paint({ kind: "accent", colour: undefined })).h).toBeCloseTo(hue, 0)
    expect(oklch(paint({ kind: "shade", strength: 1, colour: undefined })).h).toBeCloseTo(hue, 0)
  })
})
