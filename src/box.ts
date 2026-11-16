// Boxes on the globe: west, south, east, north in degrees. A box whose west
// is above its east crosses 180°.
export type Box = readonly [number, number, number, number]

type Point = readonly [number, number]

const kmPerDegree = 111.32

// A box's longitudes as one increasing span, east past 180 if it crosses.
const span = ([west, , east]: Box) =>
  [west, east - west === 360 ? east : west + ((((east - west) % 360) + 360) % 360)] as const

// How far apart two longitude spans are, the short way round.
const lonGap = (left: Box, right: Box) => {
  const [a0, a1] = span(left)
  const [b0, b1] = span(right)

  return Math.min(...[-360, 0, 360].map((shift) => Math.max(0, b0 + shift - a1, a0 - (b1 + shift))))
}

// Roughly how many kilometres apart two boxes are; 0 if they overlap.
export const gap = (left: Box, right: Box) => {
  const dy = Math.max(0, right[1] - left[3], left[1] - right[3])
  const lat = ((Math.max(left[1], right[1]) + Math.min(left[3], right[3])) / 2) * (Math.PI / 180)

  return kmPerDegree * Math.hypot(lonGap(left, right) * Math.cos(lat), dy)
}

export const contains = ([west, south, east, north]: Box, [lon, lat]: Point, margin = 0) =>
  lat >= south - margin &&
  lat <= north + margin &&
  (west <= east
    ? lon >= west - margin && lon <= east + margin
    : lon >= west - margin || lon <= east + margin)

// The smallest box around these boxes: it leaves out the widest stretch of
// longitude none of them covers, which may be the one across 180°.
const union = (boxes: ReadonlyArray<Box>): Box => {
  const spans = boxes
    .flatMap((each): ReadonlyArray<readonly [number, number]> => {
      const [west, east] = span(each)

      return east > 180
        ? [
            [west, 180],
            [-180, east - 360],
          ]
        : [[west, east]]
    })
    .toSorted((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []

  for (const [west, east] of spans) {
    const last = merged.at(-1)

    if (last !== undefined && west <= last[1]) last[1] = Math.max(last[1], east)
    else merged.push([west, east])
  }

  const south = Math.min(...boxes.map((each) => each[1]))
  const north = Math.max(...boxes.map((each) => each[3]))
  const first = merged[0]
  const last = merged.at(-1)

  if (first === undefined || last === undefined) return [-180, south, 180, north]

  let widest = first[0] + 360 - last[1]
  let west = first[0]
  let east = last[1]

  for (let index = 1; index < merged.length; index += 1) {
    const before = merged[index - 1]?.[1] ?? 0
    const after = merged[index]?.[0] ?? 0

    if (after - before > widest) {
      widest = after - before
      west = after
      east = before
    }
  }

  return widest <= 0 ? [-180, south, 180, north] : [west, south, east, north]
}

// The smallest box around these points.
export const around = (points: ReadonlyArray<Point>): Box =>
  union(points.map(([lon, lat]) => [lon, lat, lon, lat]))
