// Tidies the rings of every sheet in src/data/. Projection rounds points to
// whole units, which leaves two kinds of debris that enclose nothing and only
// draw a stray stroke across a country:
// - spikes: an outline goes out to a point and straight back;
// - flat rings: a whole ring folds back on itself.
// It removes the spikes, then the rings left flat. Run with `pnpm tidy`.
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

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

// A ring in a generated module: a bracketed list of whole numbers.
const ring = /\[\s*-?\d+(?:\s*,\s*-?\d+)+\s*,?\s*\]/g

const tidy = (source: string) => {
  const counts = { spikes: 0, rings: 0 }

  const marked = source.replace(ring, (literal) => {
    const steps = literal
      .slice(1, -1)
      .split(",")
      .filter((part) => part.trim() !== "")
      .map(Number)

    const tips = spikes(steps)
    const clean = tips === 0 ? steps : despike(steps)

    counts.spikes += tips

    if (clean.length < 6 || flat(clean)) {
      counts.rings += 1

      return "FLAT"
    }

    return tips === 0 ? literal : `[${clean.join(", ")}]`
  })

  return { source: marked.replace(/\s*FLAT\s*,?/g, ""), counts }
}

if (import.meta.main) {
  const folder = new URL("../src/data/", import.meta.url).pathname
  const total = { spikes: 0, rings: 0 }

  for (const file of readdirSync(folder).filter((name) => name.endsWith(".gen.ts"))) {
    const path = join(folder, file)
    const { source, counts } = tidy(readFileSync(path, "utf8"))

    if (counts.spikes === 0 && counts.rings === 0) continue

    writeFileSync(path, source)
    total.spikes += counts.spikes
    total.rings += counts.rings
    console.info(`${file}: ${counts.spikes} spikes, ${counts.rings} flat rings`)
  }

  console.info(`Removed ${total.spikes} spikes and ${total.rings} flat rings`)
}
