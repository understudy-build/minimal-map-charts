// How the build projected a sheet or an inset, so a point given in degrees
// lands where the outlines put its place: d3's Equal Earth, or a Lambert
// azimuthal equal-area view centred on `centre`, in degrees; then scaled by
// `scale` and moved so the view's origin sits at `at`, in the sheet's units.
export type Projection =
  | { readonly kind: "earth"; readonly scale: number; readonly at: readonly [number, number] }
  | {
      readonly kind: "azimuthal"
      readonly centre: readonly [number, number]
      readonly scale: number
      readonly at: readonly [number, number]
    }

// Longitude and latitude in degrees.
export type Degrees = readonly [number, number]

const radians = Math.PI / 180

// Equal Earth's constants, as d3-geo gives them.
const root = Math.sqrt(3) / 2
const [a1, a2, a3, a4] = [1.340264, -0.081106, 0.000893, 0.003796]

// A place's spot in a projection's units. The azimuthal view sends the point
// opposite its centre nowhere.
export const project = (
  projection: Projection,
  [lon, lat]: Degrees,
): readonly [number, number] | undefined => {
  const phi = lat * radians
  let x: number
  let y: number

  if (projection.kind === "earth") {
    const lambda = lon * radians
    const l = Math.asin(root * Math.sin(phi))
    const l2 = l * l
    const l6 = l2 * l2 * l2

    x = (lambda * Math.cos(l)) / (root * (a1 + 3 * a2 * l2 + l6 * (7 * a3 + 9 * a4 * l2)))
    y = l * (a1 + a2 * l2 + l6 * (a3 + a4 * l2))
  } else {
    const [lon0, lat0] = projection.centre
    const delta = (lon - lon0) * radians
    const phi0 = lat0 * radians
    const cosine = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(delta)

    if (cosine <= -1 + 1e-9) return undefined

    const k = Math.sqrt(2 / (1 + cosine))

    x = k * Math.cos(phi) * Math.sin(delta)
    y = k * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(delta))
  }

  const [tx, ty] = projection.at

  return [tx + projection.scale * x, ty - projection.scale * y]
}

// A place's spot in a frame `width` by `height` units, if the frame holds it.
// Both projections are one to one, so a spot inside a frame is a place the
// frame shows.
export const within = (
  projection: Projection,
  point: Degrees,
  { width, height }: { readonly width: number; readonly height: number },
): readonly [number, number] | undefined => {
  const spot = project(projection, point)

  return spot !== undefined && spot[0] >= 0 && spot[1] >= 0 && spot[0] <= width && spot[1] <= height
    ? spot
    : undefined
}

type Spot = readonly [number, number]

// Where a place shows: at each spot on the map, and in each inset that holds
// it, by the inset's index, in its units.
export interface Located {
  readonly map: ReadonlyArray<Spot>
  readonly insets: ReadonlyArray<{ readonly index: number; readonly at: Spot }>
}

// The insets that hold a place, and whether one of them takes it off the
// map: only a zoom, such as Washington, D.C., shows land the map also draws.
export const inInsets = (
  insets: ReadonlyArray<{
    readonly projection: Projection
    readonly width: number
    readonly height: number
    readonly zoom?: true
  }>,
  point: Degrees,
): { readonly insets: Located["insets"]; readonly away: boolean } => {
  const held = insets.flatMap((inset, index) => {
    const at = within(inset.projection, point, inset)

    return at === undefined ? [] : [{ index, at, zoom: inset.zoom === true }]
  })

  return {
    insets: held.map(({ index, at }) => ({ index, at })),
    away: held.some((each) => !each.zoom),
  }
}
