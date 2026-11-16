import type { Scale } from "./spec.ts"

// One class of a legend: its shade and the values it covers. A quantile class
// runs from its lowest to its highest value; a band runs from one break to
// the next, open at the ends.
export interface Bin {
  readonly shade: number
  readonly low: number | undefined
  readonly high: number | undefined
}

export interface Classed {
  // How many shades the scale has, for a palette to step through.
  readonly classes: number
  readonly shadeOf: (value: number) => number
  readonly bins: ReadonlyArray<Bin>
}

const defaultClasses = 5

// The class of a value: how many thresholds it reaches. Equal values always
// share a class, so the legend's ranges never overlap.
const reached = (thresholds: ReadonlyArray<number>) => (value: number) =>
  thresholds.filter((threshold) => value >= threshold).length

const quantile = (values: ReadonlyArray<number>, classes: number): Classed => {
  const sorted = values.toSorted((left, right) => left - right)

  // Class c starts at the value ranked c * n / classes; with fewer values than
  // classes, the upper classes stay empty.
  const thresholds = Array.from({ length: classes - 1 }, (_, index) => {
    const rank = Math.ceil(((index + 1) * sorted.length) / classes)

    return sorted[rank] ?? Number.POSITIVE_INFINITY
  })

  const shadeOf = reached(thresholds)

  const bins = Array.from({ length: classes }, (_, shade): ReadonlyArray<Bin> => {
    const members = sorted.filter((value) => shadeOf(value) === shade)

    return members.length === 0 ? [] : [{ shade, low: members[0], high: members.at(-1) }]
  }).flat()

  return { classes, shadeOf, bins }
}

const breaks = (at: ReadonlyArray<number>): Classed => ({
  classes: at.length + 1,
  shadeOf: reached(at),
  bins: Array.from({ length: at.length + 1 }, (_, shade) => ({
    shade,
    low: at[shade - 1],
    high: at[shade],
  })),
})

// How a fill's values become shades, lightest for the lowest.
export const classify = (values: ReadonlyArray<number>, scale: Scale | undefined): Classed => {
  if (scale === undefined) return quantile(values, defaultClasses)

  switch (scale.kind) {
    case "quantile":
      return quantile(values, scale.classes ?? defaultClasses)
    case "breaks":
      return breaks(scale.at)
  }
}
