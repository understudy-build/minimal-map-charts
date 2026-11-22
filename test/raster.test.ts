import { describe, expect, it } from "vitest"

import { centre, grid, groups, rasterize } from "../scripts/build-maps/raster.ts"

const cells = grid(0.1)

const square = (west: number, south: number, size: number) => [
  [west, south],
  [west + size, south],
  [west + size, south + size],
  [west, south + size],
  [west, south],
]

describe("rasterize", () => {
  it("fills the cells whose centre lies inside the outer ring and outside its holes", () => {
    const filled = rasterize(cells, {
      type: "Polygon",
      coordinates: [square(0, 0, 1), square(0.4, 0.4, 0.2)],
    })

    expect(filled.size).toBe(96)
    expect([...filled].map((cell) => centre(cells, cell))).not.toContainEqual([0.45, 0.45])
  })

  it("fills a ring that crosses the 180th meridian on both sides of it", () => {
    const filled = rasterize(cells, {
      type: "Polygon",
      coordinates: [
        [
          [179.5, 0],
          [-179.5, 0],
          [-179.5, 1],
          [179.5, 1],
          [179.5, 0],
        ],
      ],
    })

    const longitudes = new Set([...filled].map((cell) => centre(cells, cell)[0].toFixed(2)))

    expect(filled.size).toBe(100)
    expect(longitudes).toContain("179.95")
    expect(longitudes).toContain("-179.95")
    expect(groups(cells, filled)).toHaveLength(1)
  })
})

describe("groups", () => {
  it("splits cells that share no side", () => {
    const filled = rasterize(cells, {
      type: "MultiPolygon",
      coordinates: [[square(0, 0, 0.5)], [square(1, 0, 0.5)]],
    })

    expect(groups(cells, filled).map((group) => group.length)).toEqual([25, 25])
  })
})
