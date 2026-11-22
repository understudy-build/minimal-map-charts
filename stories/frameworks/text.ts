import { type Inset, paint, type Palette, range, type Scene } from "../../src/index.ts"

// What a figure's legend and credits say, with no framework in it. Each
// framework's recipe renders these the same way.

export interface Entry {
  readonly key: string
  readonly text: string
  // No swatch for the "Higher is better" note.
  readonly colour: string | undefined
}

// The legend's entries: which way is better, a swatch per bin, and "No data"
// when any country is blank.
export const entries = (scene: Scene, palette: Palette): ReadonlyArray<Entry> => {
  const key = scene.legend

  if (key === undefined) return []

  return [
    ...(key.better === undefined
      ? []
      : [
          {
            key: "better",
            text: key.better === "higher" ? "Higher is better" : "Lower is better",
            colour: undefined,
          },
        ]),
    ...key.bins.map((bin, index) => ({
      key: `bin ${index}`,
      text: range(bin),
      colour: paint(bin.shade, { palette }),
    })),
    ...(scene.shapes.some((shape) => shape.tone.kind === "blank")
      ? [{ key: "blank", text: "No data", colour: palette.blank }]
      : []),
  ]
}

// Who published the values, who drew the boundaries and who listed the
// places, in one line.
export const credit = (scene: Scene) =>
  [
    ...(scene.source === undefined ? [] : [`Data: ${scene.source}.`]),
    ...scene.credits.map(
      (each) => `Boundaries: ${each.publisher}, ${each.vintage}. ${each.license}.`,
    ),
    ...(scene.points?.credit === undefined
      ? []
      : [
          `Places: ${scene.points.credit.publisher}, ${scene.points.credit.vintage}. ${scene.points.credit.license}.`,
        ]),
  ].join(" ")

// What the details line says until the reader points at a country or a
// point.
export const hint = "Point at a country or a point, or tab to one, for its value."

// How a point's mark, or the legend's circle, looks: a bubble lets what
// lies under it show a little, and a bubble of 0 is a ring.
export const look = (
  scene: Scene,
  { palette, value }: { readonly palette: Palette; readonly value?: number | undefined },
) => {
  const colour = scene.points === undefined ? palette.ink : paint(scene.points.tone, { palette })
  const empty = scene.points?.kind === "bubble" && value === 0

  return {
    fill: empty ? "none" : colour,
    opacity: scene.points?.kind === "bubble" && !empty ? 0.85 : 1,
    stroke: empty ? colour : palette.stroke,
  }
}

// Map units to each of an inset's own. The recipes draw each inset about a
// ninth as wide as the map, as `svg` does; a mark's radius is in map units,
// so divided by this, equal values draw equal circles on the map and in an
// inset.
export const insetScale = (scene: Scene, inset: Inset) => (scene.width * 0.11) / inset.width

// The points' legend, laid out in map units: drawn in a viewBox as wide as
// the map's, in a box as wide as the map, its circles read at the map's
// scale. A swatch for dots that say what they are, a row of circles for
// bubbles, nothing otherwise.
export interface Key {
  readonly width: number
  readonly height: number
  readonly size: number
  readonly circles: ReadonlyArray<{ readonly x: number; readonly y: number; readonly r: number }>
  // `title` is what the bubbles measure, set in the ink colour.
  readonly texts: ReadonlyArray<{
    readonly x: number
    readonly y: number
    readonly text: string
    readonly title: boolean
  }>
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })

export const key = (scene: Scene): Key | undefined => {
  const { points, width } = scene
  const size = width * 0.015
  // About how wide text is, as `svg` reckons it.
  const wide = (text: string) => text.length * size * 0.55

  if (points === undefined || (points.kind === "dot" && points.label === undefined)) return

  if (points.kind === "dot") {
    const r = size * 0.4

    return {
      width,
      height: size * 1.4,
      size,
      circles: [{ x: r, y: size * 0.7, r }],
      texts: [{ x: r * 2 + size * 0.5, y: size, text: points.label ?? "", title: false }],
    }
  }

  const height = Math.max(...points.sizes.map((each) => each.radius * 2), size) + 2
  const bottom = height - 1
  const circles: Array<Key["circles"][number]> = []
  const texts: Array<Key["texts"][number]> = []
  let x = 0

  if (points.label !== undefined) {
    texts.push({ x, y: bottom - size * 0.3, text: points.label, title: true })
    x += wide(points.label) + size
  }

  for (const { value, radius } of points.sizes) {
    const text = compact.format(value)

    circles.push({ x: x + radius, y: bottom - radius, r: radius })
    texts.push({ x: x + radius * 2 + size * 0.4, y: bottom - size * 0.3, text, title: false })
    x += radius * 2 + size * 0.4 + wide(text) + size
  }

  return { width, height, size, circles, texts }
}
