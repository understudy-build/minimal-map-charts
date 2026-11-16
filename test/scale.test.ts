import { describe, expect, it } from "vitest"

import { classify } from "../src/scale.ts"

describe("classify", () => {
  it("splits values into classes of about the same size, lowest first", () => {
    const { shadeOf, bins } = classify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], undefined)

    expect([1, 2, 3, 10].map(shadeOf)).toEqual([0, 0, 1, 4])
    expect(bins).toEqual([
      { shade: 0, low: 1, high: 2 },
      { shade: 1, low: 3, high: 4 },
      { shade: 2, low: 5, high: 6 },
      { shade: 3, low: 7, high: 8 },
      { shade: 4, low: 9, high: 10 },
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

    expect(bins.map((bin) => bin.shade)).toEqual([0, 2])
  })

  it("puts a value at a break in the band above it", () => {
    const { shadeOf, bins, classes } = classify([5], { kind: "breaks", at: [0, 10] })

    expect(classes).toBe(3)
    expect([-1, 0, 9.9, 10].map(shadeOf)).toEqual([0, 1, 1, 2])
    expect(bins).toEqual([
      { shade: 0, low: undefined, high: 0 },
      { shade: 1, low: 0, high: 10 },
      { shade: 2, low: 10, high: undefined },
    ])
  })
})
