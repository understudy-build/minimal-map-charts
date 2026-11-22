// Tidies a sheet's rings after simplification. Projection rounds points to
// whole units, which leaves two kinds of debris that enclose nothing and only
// draw a stray stroke across a country:
// - spikes: an outline goes out to a point and straight back;
// - flat rings: a whole ring folds back on itself.
// It removes the spikes, then the rings left flat.
type Point = readonly [number, number]

const decode = (steps: ReadonlyArray<number>): Array<Point> => {
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

// Whether a ring encloses nothing: every segment it draws, it also draws
// backwards, so it is a line folded back on itself.
export const flat = (steps: ReadonlyArray<number>): boolean => {
  const points = decode(steps).map(([x, y]) => `${x} ${y}`)
  const segments = new Map<string, number>()

  for (const [index, from] of points.entries()) {
    const to = points[(index + 1) % points.length] ?? from

    if (from === to) continue

    const backward = `${to}>${from}`
    const open = segments.get(backward) ?? 0

    if (open > 0) segments.set(backward, open - 1)
    else segments.set(`${from}>${to}`, (segments.get(`${from}>${to}`) ?? 0) + 1)
  }

  return [...segments.values()].every((count) => count === 0)
}

// How many spike tips a ring has: points whose neighbours are the same point,
// so the outline reaches them and turns straight back.
export const spikes = (steps: ReadonlyArray<number>): number => {
  const points = decode(steps)

  return points.filter((_, index) =>
    same(points[(index + points.length - 1) % points.length], points[(index + 1) % points.length]),
  ).length
}

// The ring without its spikes or repeated points. Removing one spike can
// expose another behind it, so it repeats until none is left.
export const despike = (steps: ReadonlyArray<number>): Array<number> => {
  const points = decode(steps)
  let changed = true

  while (changed && points.length > 2) {
    changed = false

    for (let index = 0; index < points.length && points.length > 2; index += 1) {
      const before = (index + points.length - 1) % points.length
      const after = (index + 1) % points.length

      if (same(points[index], points[after])) {
        points.splice(after, 1)
        changed = true
      } else if (same(points[before], points[after])) {
        // Drop the tip and the second copy of the point it returns to.
        points.splice(Math.max(index, after), 1)
        points.splice(Math.min(index, after), 1)
        changed = true
      }
    }
  }

  return encode(points)
}

// The rings without their spikes, and without the rings left flat.
export const tidy = (rings: ReadonlyArray<ReadonlyArray<number>>): Array<ReadonlyArray<number>> =>
  rings.flatMap((ring) => {
    const clean = spikes(ring) === 0 ? ring : despike(ring)

    return clean.length < 6 || flat(clean) ? [] : [clean]
  })
