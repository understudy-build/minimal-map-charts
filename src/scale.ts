import type { Colour } from "./colour.ts"
import type { Scale } from "./spec.ts"

// How a class is painted. A shade has a strength, from 0 nearest the surface
// to 1 farthest from it, and the spec's colour or, without one, the palette's.
// The middle is the neutral class of a diverging scale.
export type Shade =
  | { readonly kind: "shade"; readonly strength: number; readonly colour: Colour | undefined }
  | { readonly kind: "middle" }

// One class of a legend: its shade and the values it covers. A quantile class
// runs from its lowest to its highest value; a band runs from one break to
// the next, open at the ends.
export interface Bin {
  readonly shade: Shade
  readonly low: number | undefined
  readonly high: number | undefined
}

export interface Classed {
  readonly classes: number
  readonly shadeOf: (value: number) => Shade
  readonly bins: ReadonlyArray<Bin>
}

const defaultClasses = 5

// The class of a value: how many thresholds it reaches. Equal values always
// share a class, so the legend's ranges never overlap.
const reached = (thresholds: ReadonlyArray<number>) => (value: number) =>
  thresholds.filter((threshold) => value >= threshold).length

// Shades for one colour, palest for the lowest class.
const ramp = (classes: number, colour: Colour | undefined): ReadonlyArray<Shade> =>
  Array.from({ length: classes }, (_, index) => ({
    kind: "shade",
    strength: index / Math.max(1, classes - 1),
    colour,
  }))

const middle: Shade = { kind: "middle" }

const quantile = (
  values: ReadonlyArray<number>,
  { classes, colour }: { readonly classes: number; readonly colour: Colour | undefined },
): Classed => {
  const sorted = values.toSorted((left, right) => left - right)

  // Class c starts at the value ranked c * n / classes; with fewer values than
  // classes, the upper classes stay empty.
  const thresholds = Array.from({ length: classes - 1 }, (_, index) => {
    const rank = Math.ceil(((index + 1) * sorted.length) / classes)

    return sorted[rank] ?? Number.POSITIVE_INFINITY
  })

  const classOf = reached(thresholds)
  const shades = ramp(classes, colour)

  const bins = shades.flatMap((shade, index): ReadonlyArray<Bin> => {
    const members = sorted.filter((value) => classOf(value) === index)

    return members.length === 0 ? [] : [{ shade, low: members[0], high: members.at(-1) }]
  })

  return { classes, shadeOf: (value) => shades[classOf(value)] ?? middle, bins }
}

const bands = (at: ReadonlyArray<number>, shades: ReadonlyArray<Shade>): Classed => {
  const classOf = reached(at)

  return {
    classes: shades.length,
    shadeOf: (value) => shades[classOf(value)] ?? middle,
    bins: shades.map((shade, index) => ({ shade, low: at[index - 1], high: at[index] })),
  }
}

// Classes below `mid` take `below`, classes above take `above`, each
// stronger the further it sits from `mid`. A band holding `mid` inside it is
// the middle; with `mid` on a break, there is none.
const diverging = (scale: Extract<Scale, { readonly kind: "diverging" }>): Classed => {
  const { at, mid, below, above } = scale
  // Classes before `under` end at or below `mid`; classes after `over` start
  // at or above it.
  const under = at.filter((each) => each <= mid).length
  const over = at.filter((each) => each < mid).length
  const reach = Math.max(under, at.length - over)

  const shades = Array.from({ length: at.length + 1 }, (_, index): Shade => {
    if (index < under) return { kind: "shade", strength: (under - index) / reach, colour: below }
    if (index > over) return { kind: "shade", strength: (index - over) / reach, colour: above }

    return middle
  })

  return bands(at, shades)
}

// How a fill's values become shades, palest for the lowest.
export const classify = (values: ReadonlyArray<number>, scale: Scale | undefined): Classed => {
  if (scale === undefined) return quantile(values, { classes: defaultClasses, colour: undefined })

  switch (scale.kind) {
    case "quantile":
      return quantile(values, {
        classes: scale.classes ?? defaultClasses,
        colour: scale.colour,
      })
    case "breaks":
      return bands(scale.at, ramp(scale.at.length + 1, scale.colour))
    case "diverging":
      return diverging(scale)
  }
}
