import { type Country, countries } from "./countries.ts"
import { globe } from "./data/globe.gen.ts"
import { type Group, groups as grouped, type Layout } from "./layout.ts"
import { type Degrees, inInsets, type Located, type Projection, project } from "./project.ts"
import { type Credit, credits, type Inset, load, type Sheet, type Steps } from "./sheet.ts"

type Point = readonly [number, number]
type Ring = ReadonlyArray<Point>
// Left, top, right, bottom.
type Rect = readonly [number, number, number, number]

export interface Frame {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

// Panels cropped from their sheets and laid out side by side in one space,
// `width` by `height` units.
export interface Composed {
  readonly width: number
  readonly height: number
  readonly panels: ReadonlyArray<Frame>
  // Land that is no country's, such as a region's neighbours.
  readonly land: Steps
  readonly outlines: ReadonlyMap<Country, Steps>
  // Countries too small to draw as a shape, as a point.
  readonly dots: ReadonlyMap<Country, Point>
  // The countries the layout names; the rest are context.
  readonly members: ReadonlySet<Country>
  readonly insets: ReadonlyArray<Inset>
  readonly credits: ReadonlyArray<Credit>
  // Where a place shows: in every panel whose crop holds it, and in every
  // inset that does, in that inset's units. A place in an inset that is not
  // a zoom shows only there.
  readonly locate: (point: Degrees) => Located
}

const width = 1000
const gutter = 24
// Below this many units across, a country draws as a dot.
const speck = 3

const decode = ([x = 0, y = 0, ...steps]: ReadonlyArray<number>): Ring => {
  const points: Array<Point> = [[x, y]]
  let at: Point = [x, y]

  for (let index = 0; index + 1 < steps.length; index += 2) {
    at = [at[0] + (steps[index] ?? 0), at[1] + (steps[index + 1] ?? 0)]
    points.push(at)
  }

  return points
}

// Twice a ring's signed area. Holes run the other way round, so a country's
// rings sum to its area less its holes.
const signed = (ring: Ring) =>
  ring.reduce((sum, [x0, y0], index) => {
    const [x1, y1] = ring[(index + 1) % ring.length] ?? [x0, y0]

    return sum + (x0 * y1 - x1 * y0)
  }, 0)

// Sheet units per kilometre. The sheets are equal-area, so every country on
// a sheet gives about the same ratio; the median ignores a country whose
// outline holds parts its area leaves out, such as France's overseas regions
// on the world.
const scaleOf = (sheet: Sheet) => {
  const ratios = countries
    .flatMap(({ code }) => {
      const area = globe[code]?.area ?? 0
      const outline = sheet.outlines[code] ?? []
      const units = Math.abs(outline.reduce((sum, ring) => sum + signed(decode(ring)), 0) / 2)

      return area === 0 || units === 0 ? [] : [Math.sqrt(units / area)]
    })
    .toSorted((a, b) => a - b)

  return ratios[Math.floor(ratios.length / 2)] ?? 1
}

// Sutherland–Hodgman: the part of a ring inside a rectangle.
const clip = (ring: Ring, [left, top, right, bottom]: Rect): Ring => {
  const edges: ReadonlyArray<{
    readonly inside: (point: Point) => boolean
    readonly cross: (a: Point, b: Point) => Point
  }> = [
    { inside: ([x]) => x >= left, cross: (a, b) => atX(a, b, left) },
    { inside: ([x]) => x <= right, cross: (a, b) => atX(a, b, right) },
    { inside: ([, y]) => y >= top, cross: (a, b) => atY(a, b, top) },
    { inside: ([, y]) => y <= bottom, cross: (a, b) => atY(a, b, bottom) },
  ]

  return edges.reduce<Ring>((points, { inside, cross }) => {
    const out: Array<Point> = []

    for (const [index, point] of points.entries()) {
      const previous = points[(index + points.length - 1) % points.length] ?? point

      if (inside(point)) {
        if (!inside(previous)) out.push(cross(previous, point))
        out.push(point)
      } else if (inside(previous)) out.push(cross(previous, point))
    }

    return out
  }, ring)
}

const atX = ([x0, y0]: Point, [x1, y1]: Point, x: number): Point => [
  x,
  y0 + ((y1 - y0) * (x - x0)) / (x1 - x0),
]

const atY = ([x0, y0]: Point, [x1, y1]: Point, y: number): Point => [
  x0 + ((x1 - x0) * (y - y0)) / (y1 - y0),
  y,
]

const bounds = (points: ReadonlyArray<Point>): Rect | undefined =>
  points.length === 0
    ? undefined
    : points.reduce<Rect>(
        ([left, top, right, bottom], [x, y]) => [
          Math.min(left, x),
          Math.min(top, y),
          Math.max(right, x),
          Math.max(bottom, y),
        ],
        [Infinity, Infinity, -Infinity, -Infinity],
      )

// Rings moved into place, in whole units, as steps; rings that round to
// nothing are dropped.
const encode = (rings: ReadonlyArray<Ring>, move: (point: Point) => Point): Steps =>
  rings.flatMap((ring) => {
    const points = ring
      .map((point) => move(point))
      .map(([x, y]) => [Math.round(x), Math.round(y)] as const)
      .filter(
        ([x, y], index, all) =>
          index === 0 || x !== all[index - 1]?.[0] || y !== all[index - 1]?.[1],
      )

    if (points.length < 3) return []

    return [
      points.flatMap(([x, y], index) => {
        const [px, py] = points[index - 1] ?? [0, 0]

        return index === 0 ? [x, y] : [x - px, y - py]
      }),
    ]
  })

const rings = (outline: Steps | undefined) => (outline ?? []).map(decode)

const tenth = (value: number) => Math.round(value * 10) / 10

interface Cropped {
  readonly view: Rect
  readonly projection: Projection
  // Sheet units per kilometre.
  readonly unit: number
  readonly outlines: ReadonlyMap<Country, ReadonlyArray<Ring>>
  readonly land: ReadonlyArray<Ring>
  readonly dots: ReadonlyMap<Country, Point>
  readonly insets: ReadonlyArray<Inset>
  readonly credits: ReadonlyArray<Credit>
}

// A group's sheet cut down to the box around its countries, with a margin.
const crop = async (group: Group, context: boolean): Promise<Cropped> => {
  const sheet = await load(group.sheet)
  const members = new Set(group.members.map((member) => member.country))
  const dots = new Map(
    group.members.flatMap(({ country }) => {
      const dot = sheet.dots?.[country]

      return dot === undefined ? [] : [[country, dot] as const]
    }),
  )
  const own = group.members.flatMap(({ country }) => rings(sheet.outlines[country]).flat())

  const rect = bounds([...own, ...dots.values()]) ?? [0, 0, sheet.width, sheet.height]
  const pad = Math.max(rect[2] - rect[0], rect[3] - rect[1], 1) * 0.03
  const view: Rect = [rect[0] - pad, rect[1] - pad, rect[2] + pad, rect[3] + pad]
  const kept = (outline: Steps | undefined) =>
    rings(outline).flatMap((ring) => {
      const inside = clip(ring, view)

      return inside.length < 3 ? [] : [inside]
    })

  return {
    view,
    projection: sheet.projection,
    unit: scaleOf(sheet),
    outlines: new Map(
      countries.flatMap(({ code }) => {
        const outline = sheet.outlines[code]

        return outline === undefined || !(context || members.has(code))
          ? []
          : [[code, kept(outline)] as const]
      }),
    ),
    land: context ? kept(sheet.land) : [],
    dots,
    insets: sheet.insets.filter((inset) =>
      group.members.some((member) => member.country === inset.country && member.insets),
    ),
    credits: credits(sheet),
  }
}

// Crops a sheet to each of the layout's panels and lays the panels out in a
// row. `named` are the countries in the fill, the places when the layout
// lists none.
export const compose = async (layout: Layout, named: ReadonlyArray<Country>): Promise<Composed> => {
  const groups = grouped(layout, named)
  const cropped = await Promise.all(groups.map((group) => crop(group, layout.context ?? true)))
  const sizes = cropped.map(({ view }) => [view[2] - view[0], view[3] - view[1]] as const)
  const room = width - gutter * (cropped.length - 1)

  // Scene units per sheet unit, for each panel.
  const scales = (() => {
    if (layout.scale === "fit") {
      const tall = room / sizes.reduce((sum, [w, h]) => sum + w / h, 0)
      const height = Math.min(tall, width)

      return sizes.map(([, h]) => height / h)
    }

    // Scene units per kilometre, the same in every panel.
    const across = sizes.reduce((sum, [w], index) => sum + w / (cropped[index]?.unit ?? 1), 0)
    const shared = room / across
    const tallest = Math.max(
      ...sizes.map(([, h], index) => (shared * h) / (cropped[index]?.unit ?? 1)),
    )
    const capped = tallest > width ? (shared * width) / tallest : shared

    return cropped.map(({ unit }) => capped / unit)
  })()

  const placed = sizes.map(
    ([w, h], index) => [w * (scales[index] ?? 1), h * (scales[index] ?? 1)] as const,
  )
  const height = Math.ceil(Math.max(...placed.map(([, h]) => h)))
  const used = placed.reduce((sum, [w]) => sum + w, 0) + gutter * (cropped.length - 1)
  let x = (width - used) / 2

  const panels: Array<Frame> = []
  const moves: Array<(point: Point) => Point> = []
  const outlines = new Map<Country, Array<ReadonlyArray<number>>>()
  const land: Array<ReadonlyArray<number>> = []
  const dots = new Map<Country, Point>()

  for (const [index, each] of cropped.entries()) {
    const scale = scales[index] ?? 1
    const [w, h] = placed[index] ?? [0, 0]
    const frame = { x, y: (height - h) / 2, width: w, height: h }
    const move = ([px, py]: Point): Point => [
      frame.x + (px - each.view[0]) * scale,
      frame.y + (py - each.view[1]) * scale,
    ]

    panels.push(frame)
    moves.push(move)
    land.push(...encode(each.land, move))

    const members = new Set(groups[index]?.members.map((member) => member.country))

    for (const [code, kept] of each.outlines) {
      const box = bounds(kept.flat().map(move))

      // A country the map is about stays in sight: too small to see, it
      // draws as a dot.
      if (
        box !== undefined &&
        members.has(code) &&
        Math.max(box[2] - box[0], box[3] - box[1]) < speck
      ) {
        dots.set(code, [tenth((box[0] + box[2]) / 2), tenth((box[1] + box[3]) / 2)])
        continue
      }

      const steps = encode(kept, move)

      if (steps.length > 0) outlines.set(code, [...(outlines.get(code) ?? []), ...steps])
    }

    for (const [code, dot] of each.dots) {
      const [dx, dy] = move(dot)

      dots.set(code, [tenth(dx), tenth(dy)])
    }

    x += w + gutter
  }

  const credited = new Map(
    cropped.flatMap((each) =>
      each.credits.map((credit) => [`${credit.publisher} ${credit.vintage}`, credit] as const),
    ),
  )

  const insets = cropped.flatMap((each) => each.insets)

  const locate = (point: Degrees): Located => {
    const held = inInsets(insets, point)
    const map = held.away
      ? []
      : cropped.flatMap(({ projection, view: [left, top, right, bottom] }, index) => {
          const spot = project(projection, point)
          const move = moves[index]

          return spot === undefined ||
            move === undefined ||
            spot[0] < left ||
            spot[0] > right ||
            spot[1] < top ||
            spot[1] > bottom
            ? []
            : [move(spot)]
        })

    return { map, insets: held.insets }
  }

  return {
    width,
    height,
    panels,
    land,
    outlines,
    dots,
    members: new Set(groups.flatMap((group) => group.members.map((member) => member.country))),
    insets,
    credits: [...credited.values()],
    locate,
  }
}
