// Who the sheets draw holding disputed land. The README's "Borders" section
// states the rule:
//
// 1. Land goes to the World Bank economy the UN recognises as its sovereign,
//    even where another state or a breakaway government holds it.
// 2. Land two economies dispute, with no settlement between them, goes to
//    the one that administers it.
// 3. Land of no economy, or that no economy administers, belongs to no
//    country: a sheet draws it as land around the countries.
//
// Natural Earth draws who holds the land, and national publishers draw their
// own government's view. `areas` moves land where Natural Earth breaks the
// rule, and `trims` cuts it out of national sheets that draw it in their own
// country.
import { readFileSync } from "node:fs"

import { geoArea } from "d3-geo"
import { Schema } from "effect"
import type { Position } from "geojson"
import { difference, intersection } from "polyclip-ts"

import type { Country } from "../../src/countries.ts"

type Pair = [number, number]

// A polygon: its outer ring, then its holes.
export type Shape = Array<Array<Pair>>

// A country's outline on a source, or land of no country.
export interface Outline {
  readonly name: string
  readonly code: Country | null
  readonly shapes: ReadonlyArray<Shape>
}

interface Area {
  // Natural Earth's name for it, as a country of its own or in its
  // disputed areas.
  readonly name: string
  readonly holder: Country | null
}

export const areas: ReadonlyArray<Area> = [
  // 1. Recognised sovereignty.
  { name: "Crimea", holder: "UKR" },
  { name: "Golan Heights", holder: "SYR" },
  { name: "N. Cyprus", holder: "CYP" },
  { name: "Cyprus U.N. Buffer Zone", holder: "CYP" },
  { name: "Somaliland", holder: "SOM" },
  // Leased to Russia and to the United States.
  { name: "Baikonur", holder: "KAZ" },
  { name: "USNB Guantanamo Bay", holder: "CUB" },
  // 2. Administered by India, claimed by Pakistan or China.
  { name: "Siachen Glacier", holder: "IND" },
  { name: "Demchok", holder: "IND" },
  { name: "Tirpani Valleys", holder: "IND" },
  // 3. A non-self-governing territory, an area under the special status the
  // 2005 Sudan peace agreement gave it, and land neither neighbour claims.
  { name: "W. Sahara", holder: null },
  { name: "Abyei", holder: null },
  { name: "Bir Tawil", holder: null },
]

// West, south, east and north in degrees.
type Box = readonly [number, number, number, number]

interface Trim {
  readonly country: Country
  readonly holder: Country
  readonly box: Box
}

// Land a national sheet draws in its country that the 1:50m atlas gives
// `holder`, cut out of the sheet inside `box`.
export const trims: ReadonlyArray<Trim> = [
  // Arunachal Pradesh.
  { country: "CHN", holder: "IND", box: [91.4, 26.5, 97.5, 29.6] },
  // The valleys India holds in the western sector, Demchok among them.
  { country: "CHN", holder: "IND", box: [78, 30.2, 80.6, 34] },
  // Bhutan's northwest valleys.
  { country: "CHN", holder: "BTN", box: [88.7, 27, 92.2, 28.5] },
  // Siachen.
  { country: "PAK", holder: "IND", box: [76.5, 35, 78, 35.9] },
  // The Shaksgam valley.
  { country: "PAK", holder: "CHN", box: [75.3, 35.5, 77.3, 36.8] },
  // Hala'ib.
  { country: "SDN", holder: "EGY", box: [33.8, 21.6, 37, 23.2] },
  // Kafia Kingi.
  { country: "SSD", holder: "SDN", box: [22.8, 8.5, 25.5, 10.5] },
  // The Ilemi triangle.
  { country: "SSD", holder: "KEN", box: [34.3, 4.2, 36.3, 5.8] },
  // The Golan Heights.
  { country: "ISR", holder: "SYR", box: [35.5, 32.6, 36, 33.4] },
]

// A point well inside each disputed area, in longitude and latitude. The
// build writes where each falls on each sheet to test/places.gen.ts, and
// test/sheets.test.ts checks who holds it there.
export const landmarks: Readonly<Record<string, readonly [number, number]>> = {
  Simferopol: [34.1, 44.95],
  Katzrin: [35.69, 33],
  Kyrenia: [33.35, 35.28],
  Hargeisa: [44.06, 9.56],
  Laayoune: [-13.2, 27.15],
  Tifariti: [-10.6, 26.15],
  Abyei: [28.43, 9.6],
  "Bir Tawil": [33.75, 21.85],
  Siachen: [77.1, 35.4],
  Itanagar: [93.6, 27.1],
  "Hala'ib": [35.6, 22.6],
  "Kafia Kingi": [24, 9.6],
  "Ilemi, south": [35.2, 4.85],
  "Ilemi, north": [35.4, 5.35],
  Taipei: [121.5, 25],
  "East Falkland": [-58.8, -51.7],
  Srinagar: [74.8, 34.08],
  Gilgit: [74.3, 35.92],
  Muzaffarabad: [73.47, 34.37],
  "Aksai Chin": [79.5, 35.2],
  Pristina: [21.16, 42.66],
  Ramallah: [35.2, 31.9],
  Abkhazia: [41.3, 43],
  Tskhinvali: [43.96, 42.23],
  Rîbnița: [29, 47.75],
  Stepanakert: [46.75, 39.82],
  Donetsk: [37.8, 48],
  Baikonur: [63.3, 45.9],
}

// Natural Earth's outlines of the areas it draws inside a country, extracted
// by disputed.ts.
const Disputed = Schema.Struct({
  source: Schema.String,
  sha256: Schema.String,
  areas: Schema.Record(
    Schema.String,
    Schema.Array(Schema.Array(Schema.Array(Schema.Tuple([Schema.Finite, Schema.Finite])))),
  ),
})

export const disputed = new URL("disputed.json", import.meta.url)

// Read on first use, so disputed.ts can write the file before it exists.
let polygons: ReadonlyMap<string, Array<Shape>> | undefined

const polygonsOf = () => {
  polygons ??= new Map(
    Object.entries(
      Schema.decodeUnknownSync(Disputed)(JSON.parse(readFileSync(disputed, "utf8"))).areas,
    ).map(([name, shapes]) => [
      name,
      shapes.map((shape) => shape.map((ring) => ring.map(([x, y]): Pair => [x, y]))),
    ]),
  )

  return polygons
}

export const pairs = (rings: ReadonlyArray<ReadonlyArray<Position>>): Shape =>
  rings.map((ring) => ring.map(([x = 0, y = 0]): Pair => [x, y]))

// A shape's area in km², whichever way its rings wind.
const km2 = (shapes: ReadonlyArray<Shape>) =>
  shapes.reduce((sum, shape) => {
    const turned = geoArea({ type: "Polygon", coordinates: shape })

    return sum + Math.min(turned, 4 * Math.PI - turned) * 6371.0088 ** 2
  }, 0)

// d3 reads a ring wound the wrong way as the whole sphere but that ring;
// polyclip winds rings that way, so a shape that covers more than a
// hemisphere is turned around.
const orient = (shape: Shape): Shape =>
  geoArea({ type: "Polygon", coordinates: shape }) > 2 * Math.PI
    ? shape.map((ring) => ring.toReversed())
    : shape

const boxOf = (shapes: ReadonlyArray<Shape>): Box => {
  const xs = shapes.flatMap((shape) => (shape[0] ?? []).map(([x]) => x))
  const ys = shapes.flatMap((shape) => (shape[0] ?? []).map(([, y]) => y))

  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

const meets = (a: Box, b: Box) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]

// Cutting one source's outline with another's leaves slivers where their
// lines differ: pieces smaller than this share of what moved go with it.
const sliver = 0.05

// The outlines with each area given to its holder: an outline named after
// an area moves whole, and land other outlines draw inside its Natural Earth
// outline is cut out and joined to the holder's.
export const settle = (outlines: ReadonlyArray<Outline>): Array<Outline> => {
  let settled = outlines.map((outline) => {
    const area = areas.find((each) => each.name === outline.name)

    return area === undefined ? outline : { ...outline, code: area.holder }
  })

  for (const area of areas) {
    const cutter = polygonsOf().get(area.name)

    if (cutter === undefined) continue

    const bounds = boxOf(cutter)
    const size = km2(cutter)
    const moved: Array<Shape> = []

    settled = settled.flatMap((outline) => {
      if (outline.code === area.holder) return [outline]

      const kept = outline.shapes.flatMap((shape) => {
        if (!meets(boxOf([shape]), bounds)) return [shape]

        const inside = intersection(shape, cutter)

        if (km2(inside) < size * sliver) return [shape]

        const outside = difference(shape, cutter)
        const small = (piece: Shape) => km2([piece]) < km2(inside) * sliver

        moved.push(...inside.map(orient), ...outside.filter(small).map(orient))

        return outside.filter((piece) => !small(piece)).map(orient)
      })

      return kept.length === 0 ? [] : [{ ...outline, shapes: kept }]
    })

    if (moved.length > 0) settled.push({ name: area.name, code: area.holder, shapes: moved })
  }

  return settled
}

// A national sheet's land with what `trims` gives another country cut out.
// `outlines` are the 1:50m atlas outlines once settled.
export const trim = (
  country: Country,
  { shapes, outlines }: { shapes: ReadonlyArray<Shape>; outlines: ReadonlyArray<Outline> },
): Array<Shape> => {
  let kept = [...shapes]

  for (const { holder, box } of trims.filter((each) => each.country === country)) {
    const [west, south, east, north] = box

    const frame: Shape = [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ]

    const cutter = outlines
      .filter((outline) => outline.code === holder)
      .flatMap((outline) => outline.shapes.filter((shape) => meets(boxOf([shape]), box)))
      .flatMap((shape) => intersection(frame, shape))

    if (cutter.length === 0) continue

    kept = kept.flatMap((shape) => {
      if (!meets(boxOf([shape]), box)) return [shape]

      const removed = km2(intersection(shape, cutter))

      return difference(shape, cutter)
        .filter((piece) => km2([piece]) >= removed * sliver)
        .map(orient)
    })
  }

  return kept
}
