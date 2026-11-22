import { describe, expect, it } from "vitest"

import { classify, type Shade } from "../src/scale.ts"

// A shade as a test reads it: its colour and strength, or "middle".
const read = (shade: Shade) =>
  shade.kind === "middle" ? "middle" : `${shade.colour ?? "palette"} ${shade.strength}`

describe("classify", () => {
  it("splits values into classes of about the same size, lowest first", () => {
    const { shadeOf, bins } = classify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], undefined)

    expect([1, 2, 3, 10].map((value) => read(shadeOf(value)))).toEqual([
      "palette 0",
      "palette 0",
      "palette 0.25",
      "palette 1",
    ])
    expect(bins.map(({ low, high }) => [low, high])).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
    ])
  })

  it("keeps equal values in one class, so legend ranges never overlap", () => {
    const { shadeOf, bins } = classify([0, 0, 0, 0, 5], { kind: "quantile", classes: 5 })

    expect(new Set([0, 0, 0, 0].map(shadeOf)).size).toBe(1)
    expect(bins.map(({ low, high }) => [low, high])).toEqual([
      [0, 0],
      [5, 5],
    ])
  })

  it("leaves upper classes empty with fewer values than classes", () => {
    const { bins } = classify([3, 7], { kind: "quantile", classes: 5 })

    expect(bins.map((bin) => read(bin.shade))).toEqual(["palette 0", "palette 0.5"])
  })

  it("puts a value at a break in the band above it", () => {
    const { shadeOf, bins, classes } = classify([5], { kind: "breaks", at: [0, 10] })

    expect(classes).toBe(3)
    expect([-1, 0, 9.9, 10].map((value) => read(shadeOf(value)))).toEqual([
      "palette 0",
      "palette 0.5",
      "palette 0.5",
      "palette 1",
    ])
    expect(bins.map(({ low, high }) => [low, high])).toEqual([
      [undefined, 0],
      [0, 10],
      [10, undefined],
    ])
  })

  it("shades every class in the scale's colour", () => {
    const { bins } = classify([1, 2, 3], { kind: "quantile", classes: 3, colour: "#2e7d32" })

    expect(bins.map((bin) => read(bin.shade))).toEqual(["#2e7d32 0", "#2e7d32 0.5", "#2e7d32 1"])
  })
})

const diverging = (at: ReadonlyArray<number>) =>
  classify([], { kind: "diverging", at, mid: 0, below: "#c62828", above: "#1565c0" })

describe("classify a diverging scale", () => {
  it("leaves the band holding the middle neutral, stronger further from it", () => {
    const { bins } = diverging([-3, -1, 1, 3])

    expect(bins.map((bin) => read(bin.shade))).toEqual([
      "#c62828 1",
      "#c62828 0.5",
      "middle",
      "#1565c0 0.5",
      "#1565c0 1",
    ])
  })

  it("has no neutral band when the middle sits on a break", () => {
    const { shadeOf } = diverging([-2, 0, 2])

    expect([-5, -1, 0, 5].map((value) => read(shadeOf(value)))).toEqual([
      "#c62828 1",
      "#c62828 0.5",
      "#1565c0 0.5",
      "#1565c0 1",
    ])
  })

  it("steps both sides alike, so a short side stops short of full strength", () => {
    const { bins } = diverging([-1, 1, 2, 3])

    expect(bins.map((bin) => read(bin.shade))).toEqual([
      "#c62828 0.3333333333333333",
      "middle",
      "#1565c0 0.3333333333333333",
      "#1565c0 0.6666666666666666",
      "#1565c0 1",
    ])
  })
})
