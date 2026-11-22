// Turns outlines in longitude and latitude into cells of a grid over the
// globe, so sources drawn by different publishers compare cell by cell
// instead of polygon by polygon. scripts/build-maps/audit.ts uses it.
import type { MultiPolygon, Polygon, Position } from "geojson"

// Cells of `step` degrees, row 0 at the north pole, column 0 at 180° west.
export interface Grid {
  readonly step: number
  readonly columns: number
  readonly rows: number
}

export const grid = (step: number): Grid => ({
  step,
  columns: Math.round(360 / step),
  rows: Math.round(180 / step),
})

const radius = 6371.0088

// The area of a cell of the row in km².
export const cellArea = ({ step, rows }: Grid, row: number) => {
  const north = (90 - row * step) * (Math.PI / 180)
  const south = (90 - Math.min(rows, row + 1) * step) * (Math.PI / 180)

  return radius ** 2 * step * (Math.PI / 180) * (Math.sin(north) - Math.sin(south))
}

// The longitude and latitude of a cell's centre.
export const centre = ({ step, columns }: Grid, cell: number): readonly [number, number] => [
  -180 + ((cell % columns) + 0.5) * step,
  90 - (Math.floor(cell / columns) + 0.5) * step,
]

// A ring with each longitude moved by whole turns to follow on from the one
// before, so a ring that crosses the 180th meridian has no jump across the
// map.
const unwrap = (ring: ReadonlyArray<Position>) => {
  let previous: number | undefined

  return ring.map(([x = 0, y = 0]): readonly [number, number] => {
    const turned = previous === undefined ? x : x + 360 * Math.round((previous - x) / 360)

    previous = turned

    return [turned, y]
  })
}

// The cells whose centre lies inside the polygon: inside its outer ring and
// outside its holes. Scanned row by row, each row filled between the
// crossings of its centre line with the rings.
const fill = (target: Grid, polygon: ReadonlyArray<ReadonlyArray<Position>>, into: Set<number>) => {
  const { step, columns, rows } = target
  const crossings = new Map<number, Array<number>>()

  for (const ring of polygon.map(unwrap))
    for (const [index, [x0, y0]] of ring.entries()) {
      const [x1, y1] = ring[(index + 1) % ring.length] ?? [x0, y0]

      if (y0 === y1) continue

      // Rows whose centre line lies in [low, high): a vertex on a centre
      // line counts once.
      const first = Math.max(0, Math.ceil((90 - Math.max(y0, y1)) / step - 0.5))
      const last = Math.min(rows - 1, Math.ceil((90 - Math.min(y0, y1)) / step - 0.5) - 1)

      for (let row = first; row <= last; row++) {
        const y = 90 - (row + 0.5) * step
        const x = x0 + ((y - y0) / (y1 - y0)) * (x1 - x0)
        const line = crossings.get(row)

        if (line === undefined) crossings.set(row, [x])
        else line.push(x)
      }
    }

  for (const [row, xs] of crossings) {
    xs.sort((a, b) => a - b)

    for (let index = 0; index + 1 < xs.length; index += 2) {
      const from = Math.ceil(((xs[index] ?? 0) + 180) / step - 0.5)
      const to = Math.ceil(((xs[index + 1] ?? 0) + 180) / step - 0.5)

      for (let column = from; column < to; column++)
        into.add(row * columns + (((column % columns) + columns) % columns))
    }
  }
}

// The cells whose centre lies inside the area.
export const rasterize = (target: Grid, area: Polygon | MultiPolygon): Set<number> => {
  const cells = new Set<number>()
  const polygons = area.type === "Polygon" ? [area.coordinates] : area.coordinates

  for (const polygon of polygons) fill(target, polygon, cells)

  return cells
}

// The cells that share a side with the cell, across the 180th meridian too.
export const neighbours = ({ columns, rows }: Grid, cell: number): ReadonlyArray<number> => {
  const row = Math.floor(cell / columns)
  const column = cell % columns

  return [
    ...(row > 0 ? [cell - columns] : []),
    ...(row < rows - 1 ? [cell + columns] : []),
    row * columns + ((column + 1) % columns),
    row * columns + ((column + columns - 1) % columns),
  ]
}

// The cells split into groups joined by shared sides.
export const groups = (target: Grid, cells: ReadonlySet<number>): Array<Array<number>> => {
  const seen = new Set<number>()
  const found: Array<Array<number>> = []

  for (const start of cells) {
    if (seen.has(start)) continue

    const group = [start]
    seen.add(start)

    for (let index = 0; index < group.length; index++)
      for (const next of neighbours(target, group[index] ?? start))
        if (cells.has(next) && !seen.has(next)) {
          seen.add(next)
          group.push(next)
        }

    found.push(group)
  }

  return found
}
