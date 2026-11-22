// Simplifies a sheet's projected rings with mapshaper's Douglas-Peucker at
// 1 sheet unit. mapshaper splits the rings into arcs and simplifies each arc
// once, so the border between two neighbours stays shared: no gaps, no
// slivers. Points stay whole units, since Douglas-Peucker only drops points.
//
// Three guards keep every ring drawable:
// - a ring that would collapse or turn inside out keeps all its points;
// - a crossing the simplification creates is repaired, then rolled back by
//   restoring the arcs on both sides until no new crossing is left;
// - the first guard runs again after the second, which can flip a ring that
//   already crossed itself in the source.
import mapshaper from "mapshaper"

const { internal } = mapshaper

// A ring as whole numbers: its first point, then the step to each next one.
export type Ring = ReadonlyArray<number>

type Point = readonly [number, number]

// Rings drawn in one coordinate space: the sheet itself, or an inset box.
// `scale` shrinks the tolerance for an inset, whose units are smaller than the
// sheet's once it is drawn beside it.
export interface Group {
  readonly scale: number
  readonly rings: ReadonlyArray<Ring>
}

const tolerance = 1

const decode = (steps: Ring): Array<Point> => {
  const points: Array<Point> = []
  let x = 0
  let y = 0

  for (let index = 0; index + 1 < steps.length; index += 2) {
    x += steps[index] ?? 0
    y += steps[index + 1] ?? 0
    points.push([x, y])
  }

  return points
}

const encode = (points: ReadonlyArray<Point>): Array<number> =>
  points.flatMap(([x, y], index) => {
    const previous = points[index - 1]

    return previous === undefined ? [x, y] : [x - previous[0], y - previous[1]]
  })

const same = (left: Point | undefined, right: Point | undefined) =>
  left !== undefined && right !== undefined && left[0] === right[0] && left[1] === right[1]

const closed = (points: ReadonlyArray<Point>) =>
  points.length > 0 && !same(points[0], points.at(-1)) ? [...points, points[0]] : points

// Twice the signed area, as the shoelace formula gives it.
const area = (points: ReadonlyArray<Point>) =>
  points.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length] ?? [x, y]

    return sum + x * nextY - nextX * y
  }, 0) / 2

const key = (ring: Ring) => JSON.stringify(ring)

// Where two segments cross, to tell a crossing the source already had from a
// new one.
const at = ({ x, y }: { readonly x: number; readonly y: number }) =>
  `${x.toFixed(8)},${y.toFixed(8)}`

const simplifyGroup = ({ scale, rings }: Group): Map<string, Ring> => {
  const unique = [...new Map(rings.map((ring) => [key(ring), ring])).values()]
  const result = new Map(unique.map((ring) => [key(ring), ring]))
  const drawn = unique.filter((ring) => area(decode(ring)) !== 0)

  if (drawn.length === 0) return result

  const { arcs, layers } = internal.importContent(
    {
      json: {
        content: JSON.stringify({
          type: "FeatureCollection",
          features: drawn.map((ring) => ({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: closed(decode(ring)) },
          })),
        }),
      },
    },
    { no_repair: true },
  )

  // Each ring is one feature with one path.
  const paths = (layers[0]?.shapes ?? []).map((shape) => shape?.[0] ?? [])

  if (paths.length !== drawn.length) throw new Error("mapshaper dropped a ring")

  const crossings = () => internal.findSegmentIntersections(arcs, {})

  const source = new Set(crossings().map(at))
  const fresh = () => crossings().filter((crossing) => !source.has(at(crossing)))

  internal.simplifyPaths(arcs, { method: "dp", spherical: false, weighting: 0.7 })
  arcs.setRetainedInterval(tolerance * scale)

  const vertices = arcs.getVertexData()
  const owners = new Int32Array(vertices.xx.length)

  for (const [arc, count] of vertices.nn.entries()) {
    const start = vertices.ii[arc] ?? 0

    owners.fill(arc, start, start + count)
  }

  // Keeps every point of the arcs given, by giving them infinite weight.
  const keep = (ids: Iterable<number>) => {
    for (const id of ids) {
      const arc = id < 0 ? ~id : id
      const start = vertices.ii[arc] ?? 0

      vertices.zz.fill(Infinity, start, start + (vertices.nn[arc] ?? 0))
    }
  }

  const points = (index: number) => {
    const iterator = arcs.getShapeIter(paths[index] ?? [])
    const found: Array<Point> = []

    while (iterator.hasNext()) found.push([iterator.x, iterator.y])

    return found
  }

  // Whether a ring collapsed or turned inside out.
  const broken = (index: number) => {
    const now = area(points(index))

    return now === 0 || now * area(decode(drawn[index] ?? [])) < 0
  }

  const uncross = () => {
    for (let pass = 0, left = fresh(); left.length > 0; pass += 1, left = fresh()) {
      if (pass >= 100) throw new Error("Could not roll back new crossings")

      keep(left.flatMap(({ a, b }) => [...a, ...b].map((vertex) => owners[vertex] ?? 0)))
    }
  }

  for (const index of drawn.keys()) if (broken(index)) keep(paths[index] ?? [])

  internal.repairIntersections(arcs, crossings())
  uncross()

  for (let flipped = true; flipped;) {
    flipped = false

    for (const index of drawn.keys()) {
      if (!broken(index)) continue

      keep(paths[index] ?? [])
      flipped = true
    }

    if (flipped) uncross()
  }

  for (const [index, ring] of drawn.entries()) {
    const original = decode(ring)
    const simplified = points(index)

    if (area(simplified) * area(original) <= 0) throw new Error("A simplified ring flipped")

    if (!simplified.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)))
      throw new Error("mapshaper moved a point off the grid")

    // closed() added a last point the source ring did not have.
    result.set(
      key(ring),
      encode(same(original[0], original.at(-1)) ? simplified : simplified.slice(0, -1)),
    )
  }

  return result
}

// Simplifies every group and returns each ring's simplified form. A ring
// found in two groups takes the result of the one with the smaller scale.
export const simplify = (groups: ReadonlyArray<Group>): ((ring: Ring) => Ring) => {
  const simplified = new Map<string, Ring>()

  for (const group of groups.toSorted((left, right) => left.scale - right.scale))
    for (const [ring, result] of simplifyGroup(group))
      if (!simplified.has(ring)) simplified.set(ring, result)

  return (ring) => {
    const result = simplified.get(key(ring))

    if (result === undefined) throw new Error("Ring missing from every group")

    return result
  }
}
