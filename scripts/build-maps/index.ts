// Writes src/data/: the world, each region and each country with a map of
// its own, projected once so the browser never projects, and sheets.gen.ts,
// which imports one when a map of it is drawn. Run with `pnpm build:maps`.
//
// For each sheet it:
// 1. projects the outlines to whole sheet units: Natural Earth countries from
//    world-atlas for the world and regions, and each country's subdivisions
//    from its pinned source snapshot (sources.ts);
// 2. simplifies them on shared arcs (simplify.ts);
// 3. removes the spikes and flat rings rounding leaves (tidy.ts);
// 4. draws a country left with no ring on a world or regional sheet as a dot.
//
// Ported from civicdata's packages/maps/scripts/maps.ts at commit 6c2d279.
import { mkdirSync, writeFileSync } from "node:fs"

import {
  geoArea,
  geoAzimuthalEqualArea,
  geoCentroid,
  geoEqualEarth,
  type GeoPermissibleObjects,
  type GeoProjection,
  geoPath,
} from "d3-geo"
import { Match, Schema } from "effect"
import type {
  FeatureCollection,
  GeometryCollection as Geometries,
  MultiPoint,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson"
import { feature, merge } from "topojson-client"
import { topology } from "topojson-server"
import type { MultiPolygon as Arcs, Polygon as Arc } from "topojson-specification"

import { type Country, countries } from "../../src/countries.ts"
import { type Region, regions } from "../../src/regions.ts"
import { credits, type Footprint, type Sheet } from "../../src/sheet.ts"
import { restore } from "./archive.ts"
import { atlas, type Detail, isArea } from "./atlas.ts"
import { landmarks } from "./borders.ts"
import { subdivision } from "./iso.ts"
import { mapped } from "./mapped.ts"
import { nations, type Nation } from "./nations.ts"
import { type Group, simplify, type Ring } from "./simplify.ts"
import { file, read } from "./sources.ts"
import { tidy } from "./tidy.ts"

type Points = Array<readonly [number, number]>

// The projected rings of an area, in whole units, with repeated points
// dropped. The projection clips them at the edge of its map.
const ringsOf = (projection: GeoProjection, area: GeoPermissibleObjects) => {
  const rings: Array<Points> = []

  const add = (x: number, y: number) => {
    const point = [Math.round(x), Math.round(y)] as const
    const ring = rings.at(-1)
    const last = ring?.at(-1)

    if (ring !== undefined && (last === undefined || last[0] !== point[0] || last[1] !== point[1]))
      ring.push(point)
  }

  geoPath(projection, {
    beginPath: () => undefined,
    moveTo: (x, y) => {
      rings.push([])
      add(x, y)
    },
    lineTo: add,
    closePath: () => undefined,
    arc: () => undefined,
  })(area)

  return rings.filter((ring) => ring.length >= 3)
}

// Each ring as whole numbers: its first point, then the step to each next one.
const stepsOf = (rings: ReadonlyArray<Points>): Array<Ring> =>
  rings.map((ring) =>
    ring.flatMap(([x, y], index) => {
      const previous = ring[index - 1]

      return previous === undefined ? [x, y] : [x - previous[0], y - previous[1]]
    }),
  )

const hasArea = (ring: Points) => {
  const [first, second, ...rest] = ring

  return (
    first !== undefined &&
    second !== undefined &&
    rest.some(
      ([x, y]) =>
        (second[0] - first[0]) * (y - first[1]) !== (second[1] - first[1]) * (x - first[0]),
    )
  )
}

const sizeOf = (projection: GeoProjection, area: GeoPermissibleObjects) => {
  const [, [right, bottom]] = geoPath(projection).bounds(area)

  return { width: Math.ceil(right), height: Math.ceil(bottom) }
}

const folder = new URL("../../src/data/", import.meta.url)

// Where each landmark in borders.ts falls on each sheet it frames, in sheet
// units, for test/sheets.test.ts.
const placed: Record<string, Record<string, readonly [number, number]>> = {}

const mark = (
  id: string,
  projection: GeoProjection,
  { width, height }: { readonly width: number; readonly height: number },
) => {
  placed[id] = Object.fromEntries(
    Object.entries(landmarks).flatMap(([name, at]) => {
      const [x, y] = projection([...at]) ?? [-1, -1]

      return x >= 0 && x <= width && y >= 0 && y <= height
        ? [[name, [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const]]
        : []
    }),
  )
}

interface Inset {
  readonly name: string
  readonly country: Country
  readonly coverage?: "National" | "Context" | undefined
  readonly width: number
  readonly height: number
  readonly outline: ReadonlyArray<Ring>
  readonly areas?: ReadonlyArray<Area> | undefined
}

interface Area {
  readonly code: string
  readonly name: string
  readonly outline: ReadonlyArray<Ring>
}

// An inset's units shrink once it is drawn beside the sheet, so its rings
// are simplified at a finer tolerance.
const groupOf = (inset: Inset): Group => ({
  scale: Math.min(inset.width / 1000, inset.height / 750),
  rings: [...inset.outline, ...(inset.areas ?? []).flatMap((area) => area.outline)],
})

const cleanInset = (clean: (rings: ReadonlyArray<Ring>) => Array<Ring>) => (inset: Inset) => ({
  ...inset,
  outline: clean(inset.outline),
  areas: inset.areas?.map((area) => ({ ...area, outline: clean(area.outline) })),
})

// The middle of a ring's box, where a dot stands in for it.
const middle = (rings: ReadonlyArray<Ring>): readonly [number, number] => {
  const xs: Array<number> = []
  const ys: Array<number> = []

  for (const ring of rings) {
    let x = 0
    let y = 0

    for (let index = 0; index + 1 < ring.length; index += 2) {
      x += ring[index] ?? 0
      y += ring[index + 1] ?? 0
      xs.push(x)
      ys.push(y)
    }
  }

  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
}

// A world or regional sheet as written: countries left with no ring once
// tidied move from `outlines` to `dots`.
const finishSheet = (sheet: {
  readonly width: number
  readonly height: number
  readonly outlines: ReadonlyArray<readonly [Country, ReadonlyArray<Ring>]>
  readonly land: ReadonlyArray<Ring>
  readonly insets: ReadonlyArray<Inset>
}) => {
  const simplified = simplify([
    { scale: 1, rings: [...sheet.outlines.flatMap(([, rings]) => rings), ...sheet.land] },
    ...sheet.insets.map(groupOf),
  ])

  const clean = (rings: ReadonlyArray<Ring>) => tidy(rings.map(simplified))
  const outlines: Array<readonly [Country, Array<Ring>]> = []
  const dots: Array<readonly [Country, readonly [number, number]]> = []

  for (const [code, rings] of sheet.outlines) {
    const tidied = clean(rings)

    if (tidied.length > 0) outlines.push([code, tidied])
    else dots.push([code, middle(rings.map(simplified))])
  }

  const body = JSON.stringify({
    width: sheet.width,
    height: sheet.height,
    outlines: Object.fromEntries(outlines),
    land: clean(sheet.land),
    insets: sheet.insets.map(cleanInset(clean)),
  })

  return dots.length === 0
    ? body
    : `{
  // Too small to draw as a shape at this scale: drawn as a dot at its place.
  dots: ${JSON.stringify(Object.fromEntries(dots))},
${body.slice(1)}`
}

const write = (id: string, { detail, body }: { detail: Detail; body: string }) =>
  writeFileSync(
    new URL(`${id}.gen.ts`, folder),
    `// Generated by scripts/build-maps/index.ts from Natural Earth 1:${detail} country outlines
// (public domain, https://www.naturalearthdata.com) via world-atlas. Do not edit.
import type { Sheet } from "../sheet.ts"

const sheet: Sheet = ${body}

export default sheet
`,
  )

// The world in the Equal Earth projection, 1000 units wide, with each World
// Bank economy large enough to draw at this scale, and land of no economy,
// such as Taiwan and Western Sahara, as land. It leaves Antarctica out. d3
// clips Russia and Fiji at the edge.
const drawWorld = () => {
  const sphere: GeoPermissibleObjects = { type: "Sphere" }
  const projection = geoEqualEarth().fitWidth(1000, sphere)
  const source = atlas["110m"]

  const outlines = feature(source, source.objects.countries).features.flatMap((place) => {
    const { code } = place.properties

    return code === null ? [] : [[code, stepsOf(ringsOf(projection, place))] as const]
  })

  const land = orient(
    merge(
      source,
      source.objects.countries.geometries
        .filter(isArea)
        .filter(({ properties }) => properties?.code === null && properties.name !== "Antarctica"),
    ),
  )

  mark("world", projection, sizeOf(projection, sphere))

  write("world", {
    detail: "110m",
    body: finishSheet({
      ...sizeOf(projection, sphere),
      outlines,
      land: stepsOf(ringsOf(projection, land)),
      insets: [],
    }),
  })
}

// West, south, east and north in degrees. West is greater than east when the
// box crosses the 180th meridian.
type Box = readonly [number, number, number, number]

const within =
  ([west, south, east, north]: Box) =>
  ([x = 0, y = 0]: Position) => {
    const across = west <= east ? x >= west && x <= east : x >= west || x <= east

    return across && y >= south && y <= north
  }

const inside = (box: Box) => (polygon: ReadonlyArray<Array<Position>>) =>
  within(box)(geoCentroid({ type: "Polygon", coordinates: [...polygon] }))

// A part of a country drawn in its own box beside the map, found by the box
// its land lies in.
interface Away {
  readonly name: string
  readonly country: Country
  readonly box: Box
}

// The EU's outermost regions. Natural Earth draws them as parts of France,
// Spain and Portugal.
const outermost: ReadonlyArray<Away> = [
  { name: "Guadeloupe", country: "FRA", box: [-62, 15.7, -60.9, 16.6] },
  { name: "Martinique", country: "FRA", box: [-61.3, 14.3, -60.7, 15] },
  { name: "French Guiana", country: "FRA", box: [-55, 1.5, -51, 6] },
  { name: "Réunion", country: "FRA", box: [55, -21.5, 56, -20.7] },
  { name: "Mayotte", country: "FRA", box: [44.9, -13.1, 45.4, -12.5] },
  { name: "Canaries", country: "ESP", box: [-18.5, 27.4, -13, 29.5] },
  { name: "Azores", country: "PRT", box: [-31.5, 36.7, -24.8, 40] },
  { name: "Madeira", country: "PRT", box: [-17.5, 32.3, -16, 33.2] },
]

const hawaii: Away = { name: "Hawaii", country: "USA", box: [-160.5, 18.8, -154.7, 22.3] }

// How each region is drawn: a Lambert azimuthal equal-area projection centred
// on `centre`, framed on the parts of its countries whose middle lies in
// `box`. Parts outside it, e.g. Svalbard on the map of Europe, fall outside
// the frame, and `insets` move to their own boxes. A country in `cut` is too
// large for the frame: the frame reaches as far as its land inside `box`,
// and the rest falls off the edge, e.g. Russia east of the Urals.
interface Frame {
  readonly centre: readonly [number, number]
  readonly box: Box
  readonly detail: Detail
  readonly insets?: ReadonlyArray<Away>
  readonly cut?: ReadonlyArray<Country>
}

const frames: Record<Region["id"], Frame> = {
  baltics: { centre: [24, 57], box: [20, 53, 29, 60], detail: "10m" },
  "western-balkans": { centre: [20, 42.5], box: [13, 39, 24, 47], detail: "10m" },
  "south-caucasus": { centre: [45, 41], box: [39, 38, 51, 44], detail: "10m" },
  gulf: { centre: [50, 24], box: [34, 12, 60, 33], detail: "10m" },
  caribbean: { centre: [-72, 18], box: [-86, 9, -58, 28], detail: "10m" },
  "central-america": { centre: [-95, 18], box: [-118, 6, -76, 33], detail: "50m" },
  nordics: { centre: [12, 64], box: [-25, 54, 32, 72], detail: "50m" },
  "west-africa": { centre: [-5, 13], box: [-26, 3, 16, 28], detail: "50m" },
  "central-africa": { centre: [18, 2], box: [5, -19, 32, 24], detail: "50m" },
  "east-africa": { centre: [40, 0], box: [21, -13, 57, 23], detail: "50m" },
  "southern-africa": { centre: [30, -20], box: [11, -35, 64, -4], detail: "50m" },
  "north-africa": { centre: [10, 25], box: [-18, 8, 38, 38], detail: "50m" },
  "middle-east": { centre: [44, 28], box: [25, 12, 64, 43], detail: "50m" },
  "central-asia": { centre: [64, 44], box: [46, 35, 88, 56], detail: "50m" },
  "south-asia": { centre: [72, 22], box: [43, -2, 98, 40], detail: "50m" },
  "southeast-asia": { centre: [115, 6], box: [91, -12, 142, 29], detail: "50m" },
  "east-asia": { centre: [112, 36], box: [72, 17, 150, 54], detail: "50m" },
  australia: { centre: [155, -27], box: [110, -55, -170, 0], detail: "50m" },
  europe: { centre: [10, 52], box: [-25, 34, 47, 72], detail: "50m", insets: outermost },
  "extended-europe": {
    centre: [20, 54],
    box: [-25, 34, 60, 72],
    detail: "50m",
    insets: outermost,
    cut: ["RUS"],
  },
  "south-america": { centre: [-60, -20], box: [-92, -57, -34, 13], detail: "50m" },
  "latin-america": { centre: [-75, -5], box: [-118, -57, -32, 33], detail: "50m" },
  "north-america": {
    centre: [-100, 50],
    box: [-170, 14, -10, 84],
    detail: "50m",
    insets: [hawaii],
  },
  "sub-saharan-africa": { centre: [20, -5], box: [-26, -35, 64, 28], detail: "50m" },
  africa: { centre: [17, 2], box: [-26, -35, 64, 38], detail: "50m" },
  "northeast-asia": { centre: [105, 55], box: [19, 17, -168, 82], detail: "50m" },
  "post-soviet": { centre: [75, 55], box: [19, 35, -168, 82], detail: "50m" },
  oceania: { centre: [175, -15], box: [110, -55, -130, 21], detail: "50m" },
  americas: {
    centre: [-80, 15],
    box: [-170, -57, -10, 84],
    detail: "50m",
    insets: [hawaii],
  },
}

const polygonsOf = (geometry: Polygon | MultiPolygon) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates

const multi = (polygons: ReadonlyArray<Array<Array<Position>>>): MultiPolygon => ({
  type: "MultiPolygon",
  coordinates: [...polygons],
})

// Each inset's box is 120 by 90 units, its land fitted inside with a margin.
const inset = { width: 120, height: 90, margin: 8 }

// A region's map, 1000 units wide. Every country outside the region is land,
// drawn as one shape around it.
const drawRegion = ({ id, countries: members }: Region) => {
  const { centre, box, detail, insets = [], cut = [] } = frames[id]
  const source = atlas[detail]
  const included = new Set<Country>(members)

  const places = feature(source, source.objects.countries).features.flatMap((place) => {
    const { code } = place.properties
    const { geometry } = place

    return code !== null &&
      included.has(code) &&
      (geometry.type === "Polygon" || geometry.type === "MultiPolygon")
      ? [{ code, polygons: polygonsOf(geometry) }]
      : []
  })

  const overseas = insets.map((away) => {
    const lies = inside(away.box)

    const polygons = places
      .filter((place) => place.code === away.country)
      .flatMap((place) => place.polygons.filter(lies))

    if (polygons.length === 0) throw new Error(`No land found for ${away.name} in ${id}`)

    return { ...away, area: multi(polygons) }
  })

  const moved = (polygon: ReadonlyArray<Array<Position>>) =>
    insets.some((away) => inside(away.box)(polygon))

  const framed = inside(box)

  const mainland = places.map(({ code, polygons }) => ({
    code,
    area: multi(polygons.filter((polygon) => !moved(polygon))),
  }))

  const reach: MultiPoint = {
    type: "MultiPoint",
    coordinates: mainland
      .filter(({ code }) => cut.includes(code))
      .flatMap(({ area }) => area.coordinates.flatMap(([outer = []]) => outer))
      .filter(within(box)),
  }

  const frame: Geometries = {
    type: "GeometryCollection",
    geometries: [multi(mainland.flatMap(({ area }) => area.coordinates.filter(framed))), reach],
  }

  // Fitted 980 units wide, then moved 10 in, so no coast touches the edge.
  const projection = geoAzimuthalEqualArea().rotate([-centre[0], -centre[1]]).fitWidth(980, frame)

  const [x, y] = projection.translate()
  const { height } = sizeOf(projection.translate([x + 10, y + 10]), frame)
  const size = { width: 1000, height: height + 10 }

  projection.clipExtent([
    [0, 0],
    [size.width, size.height],
  ])

  const merged = merge(
    source,
    source.objects.countries.geometries.filter(isArea).filter((geometry) => {
      const code = geometry.properties?.code ?? null

      return code === null || !included.has(code)
    }),
  )

  // d3 reads a ring wound the wrong way as the whole sphere but that ring;
  // merging the 1:10m outlines leaves some so. No land covers a hemisphere,
  // so any polygon that does is turned around.
  const land = orient(merged)

  const outlines = mainland.flatMap(({ code, area }) => {
    const rings = ringsOf(projection, area)

    return rings.length === 0 ? [] : [[code, stepsOf(rings)] as const]
  })

  mark(id, projection, size)

  write(id, {
    detail,
    body: finishSheet({
      ...size,
      outlines,
      land: stepsOf(ringsOf(projection, land)),
      insets: overseas.map(({ name, country, area }) => {
        const [longitude, latitude] = geoCentroid(area)

        const fitted = geoAzimuthalEqualArea()
          .rotate([-longitude, -latitude])
          .fitExtent(
            [
              [inset.margin, inset.margin],
              [inset.width - inset.margin, inset.height - inset.margin],
            ],
            area,
          )

        return {
          name,
          country,
          width: inset.width,
          height: inset.height,
          outline: stepsOf(ringsOf(fitted, area)),
        }
      }),
    }),
  })
}

const orient = (geometry: MultiPolygon) =>
  multi(
    geometry.coordinates.map((polygon) =>
      geoArea({ type: "Polygon", coordinates: polygon }) > 2 * Math.PI
        ? polygon.map((ring) => ring.toReversed())
        : polygon,
    ),
  )

const metadata = Schema.Struct({
  code: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  iso: Schema.optional(Schema.String),
})

// Sheets whose source gives valid ISO 3166-2 codes to the wrong areas:
// Natural Earth numbers Iran's provinces as ISO did before it renumbered them.
const misnumbered = new Set(["iran"])

// The ISO 3166-2 code each area is published under, by its source code:
// the one mapped.ts gives it, or else the one its source gives it, if the
// reference lists it for the country and mapped.ts gives it to no other area.
// A code two areas' sources claim goes to neither. An area missing here keeps
// its source code.
const isoCodes = (
  nation: Nation,
  divisions: ReadonlyArray<{ readonly code: string; readonly claims: ReadonlyArray<string> }>,
) => {
  const table = Object.entries(mapped[nation.country] ?? {})

  for (const [code, iso] of table) {
    if (!divisions.some((division) => division.code === code))
      throw new Error(`${nation.id}: mapped.ts names ${code}, which the sheet does not draw`)

    if (subdivision(nation.country, iso) === undefined)
      throw new Error(
        `${nation.id}: mapped.ts gives ${code} ${iso}, which is not a code of ${nation.country}`,
      )
  }

  const stated = misnumbered.has(nation.id)
    ? []
    : divisions.flatMap(({ code, claims }) => {
        if (table.some(([each]) => each === code)) return []

        const listed = new Set(
          claims.filter((claim) => subdivision(nation.country, claim) !== undefined),
        )

        if (listed.size > 1)
          throw new Error(`${nation.id}: ${code} has the ISO codes ${[...listed].join(", ")}`)

        return [...listed].map((iso) => ({ code, iso }))
      })

  // A source's claim to a code the table gives another area is wrong.
  const valid = [
    ...table.map(([code, iso]) => ({ code, iso })),
    ...stated.filter(({ iso }) => !table.some(([, each]) => each === iso)),
  ]

  const claimants = (iso: string) => valid.filter((each) => each.iso === iso).length

  for (const [code, iso] of table)
    if (claimants(iso) > 1)
      throw new Error(`${nation.id}: mapped.ts gives ${iso} to ${code} and another area`)

  return new Map(
    valid.flatMap(({ code, iso }) => (claimants(iso) === 1 ? [[code, iso] as const] : [])),
  )
}

// Project whole administrative regions, dissolving their source departments or provinces.
const drawNation = (nation: Nation) => {
  const input = read(nation)
  const parts = input.lands

  const boundaries: FeatureCollection<Polygon | MultiPolygon, { code: string; name: string }> = {
    type: "FeatureCollection",
    features: [...parts],
  }

  const source = topology({ divisions: boundaries })
  const collection = source.objects["divisions"]

  if (collection?.type !== "GeometryCollection")
    throw new Error("Expected a collection of administrative areas")

  const pieces = collection.geometries.map((geometry) => {
    if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")
      throw new Error("Administrative areas must be polygons")
    const { code, name, iso } = Schema.decodeUnknownSync(metadata)(geometry.properties)

    const area: Arc | Arcs =
      geometry.type === "Polygon"
        ? { type: "Polygon", arcs: geometry.arcs }
        : { type: "MultiPolygon", arcs: geometry.arcs }

    return { geometry: area, code, name, iso }
  })

  const divisions = nation.codes.map((code) => {
    const selected = pieces.filter((piece) => piece.code === code)
    const geometries = selected.map((piece) => piece.geometry)
    const name = selected[0]?.name

    if (name === undefined) throw new Error(`No name for ${code}`)

    // GeoJSON publishers can use either ring winding; d3 needs small land areas.
    return {
      code,
      name,
      claims: selected.flatMap((piece) => (piece.iso === undefined ? [] : [piece.iso])),
      geometry: orient(merge(source, geometries)),
    }
  })

  const published = isoCodes(nation, divisions)
  const publish = (code: string) => published.get(code) ?? code

  const offshore = nation.offshore ?? []

  const mainland = divisions.flatMap((division) => {
    if (nation.insets.some((away) => away.code === division.code && away.detached)) return []

    const polygons = polygonsOf(division.geometry).filter(
      (polygon) =>
        !offshore.some((away) => away.code === division.code && inside(away.box)(polygon)),
    )

    if (polygons.length === 0) throw new Error(`No mainland for ${division.code}`)

    return [{ code: division.code, name: division.name, geometry: multi(polygons) }]
  })

  const context = (nation.land ?? []).map((code) => {
    const part = parts.find((candidate) => candidate.properties.code === code)

    if (part === undefined) throw new Error(`No context land for ${code}`)

    return orient(multi(polygonsOf(part.geometry)))
  })

  const land = multi(context.flatMap(polygonsOf))

  const area: Geometries = {
    type: "GeometryCollection",
    geometries: [...mainland.map((division) => division.geometry), ...context],
  }

  const projection = geoAzimuthalEqualArea()
    .rotate([-nation.centre[0], -nation.centre[1]])
    .fitWidth(980, area)

  const [x, y] = projection.translate()
  projection.translate([x + 10, y + 10])
  const { height } = sizeOf(projection, area)

  const background = stepsOf(ringsOf(projection, land))

  const areas: ReadonlyArray<Area> = mainland.map((division) => ({
    code: publish(division.code),
    name: division.name,
    outline: stepsOf(ringsOf(projection, division.geometry)),
  }))

  const projectInset = (
    geometry: MultiPolygon,
    { name, code, coverage }: { name: string; code?: string; coverage?: "National" | "Context" },
  ): Inset => {
    if (geometry.coordinates.length === 0) throw new Error(`No land in inset ${name}`)
    const [longitude, latitude] = geoCentroid(geometry)

    const fitted = geoAzimuthalEqualArea()
      .rotate([-longitude, -latitude])
      .fitExtent(
        [
          [8, 8],
          [232, 172],
        ],
        geometry,
      )

    const rings = ringsOf(fitted, geometry)

    if (code !== undefined && !rings.some(hasArea)) throw new Error(`Collapsed named inset ${name}`)
    const outline = stepsOf(rings)

    return {
      name,
      country: nation.country,
      coverage,
      width: 240,
      height: 180,
      outline,
      areas: code === undefined ? undefined : [{ code, name, outline }],
    }
  }

  const insets = [
    ...nation.insets.map(({ code, box, coverage }) => {
      const division = divisions.find((candidate) => candidate.code === code)

      if (division === undefined) throw new Error(`No geometry for inset ${code}`)

      const geometry =
        box === undefined
          ? division.geometry
          : multi(polygonsOf(division.geometry).filter(inside(box)))

      return projectInset(geometry, {
        name: division.name,
        code: publish(code),
        ...(coverage === undefined ? {} : { coverage }),
      })
    }),
    ...offshore.map(({ code, name, box }) => {
      const division = divisions.find((candidate) => candidate.code === code)

      if (division === undefined) throw new Error(`No geometry for offshore part ${code}`)

      return projectInset(multi(polygonsOf(division.geometry).filter(inside(box))), { name })
    }),
    ...(nation.context ?? []).map(({ name, codes: members, box }) => {
      const selected = parts.filter((part) => members.includes(part.properties.code))

      const polygons = polygonsOf(
        orient(multi(selected.flatMap((part) => polygonsOf(part.geometry)))),
      )

      const geometry = multi(box === undefined ? polygons : polygons.filter(inside(box)))

      return projectInset(geometry, { name, coverage: "Context" })
    }),
  ]

  const simplified = simplify([
    { scale: 1, rings: [...areas.flatMap((each) => each.outline), ...background] },
    ...insets.map(groupOf),
  ])

  const clean = (rings: ReadonlyArray<Ring>) => tidy(rings.map(simplified))

  const credit = Match.value(input).pipe(
    Match.when(
      { source: "ONS" },
      () => "ONS ITL1 January 2025 BUC (OGL v3.0; contains OS data, Crown copyright 2025).",
    ),
    Match.when(
      { source: "Tailte" },
      () => "Tailte Éireann Local Authorities 2024 (CC BY 4.0), simplified for display.",
    ),
    Match.when(
      { source: "LandBoard" },
      () => "Estonian Land and Spatial Development Board, 12 November 2026.",
    ),
    Match.when({ source: "NaturalEarth" }, () => "Natural Earth Admin 1 v5.1.2 (public domain)."),
    Match.when({ source: "Boundary" }, (boundary) => JSON.stringify(boundary.credit)),
    Match.exhaustive,
  )

  const shown =
    nation.insets.length === 0
      ? "areas"
      : "areas.filter((area) => !insets.some((inset) => inset.areas?.some((part) => part.code === area.code)))"

  const uncoded = divisions.filter((division) => !published.has(division.code))

  const gap =
    uncoded.length === 0
      ? ""
      : `\n// ${uncoded.length} of ${divisions.length} areas keep their source's code, with no ISO 3166-2 code the build trusts: see scripts/build-maps/uncoded.gen.ts.`

  mark(nation.country, projection, { width: 1000, height: height + 10 })

  writeFileSync(
    new URL(`${nation.id}.gen.ts`, folder),
    `// Generated by scripts/build-maps/index.ts from ${credit}${gap}
import type { Sheet } from "../sheet.ts"

const areas = ${JSON.stringify(areas.map(({ code, name, outline }) => ({ code, name, outline: clean(outline) })))}

const insets: Sheet["insets"] = ${JSON.stringify(insets.map(cleanInset(clean)))}

const sheet: Sheet = {
  width: 1000, height: ${height + 10},
  outlines: { ${nation.country}: areas.flatMap((area) => area.outline) },
  land: ${JSON.stringify(clean(background))}, insets,
  subdivisions: { country: "${nation.country}", source: "${nation.source}", ${input.source === "Boundary" ? `credit: ${JSON.stringify(input.credit)},` : ""} areas: ${shown} },
}

export default sheet
`,
  )

  return { nation, uncoded }
}

await restore(nations.map(file))

mkdirSync(folder, { recursive: true })

drawWorld()

const drawn = nations.map(drawNation)

for (const region of regions) drawRegion(region)

// A written sheet's footprint: what a page needs to reserve its map's height
// before the sheet loads. `id` names the sheet's file; `members` are the
// countries the sheet frames.
const footprintOf = async (id: string, members: ReadonlyArray<Country>): Promise<Footprint> => {
  const { default: sheet }: { readonly default: Sheet } = await import(
    new URL(`${id}.gen.ts`, folder).href
  )
  const absent = members.filter(
    (code) => sheet.outlines[code] === undefined && sheet.dots?.[code] === undefined,
  )

  return {
    width: sheet.width,
    height: sheet.height,
    insets: sheet.insets.map((each) => [each.width, each.height] as const),
    credits: credits(sheet).length,
    ...(absent.length === 0 ? {} : { absent }),
  }
}

const footprints = [
  [
    "world",
    await footprintOf(
      "world",
      countries.map((country) => country.code),
    ),
  ],
  ...(await Promise.all(
    regions.map(async (region) => [region.id, await footprintOf(region.id, region.countries)]),
  )),
  ...(await Promise.all(
    nations.map(async (nation) => [nation.country, await footprintOf(nation.id, [nation.country])]),
  )),
] as const

writeFileSync(
  new URL("sheets.gen.ts", folder),
  `// Generated by scripts/build-maps/index.ts. Do not edit.
import type { Country } from "../countries.ts"
import type { Region } from "../regions.ts"
import type { Footprint, Sheet } from "../sheet.ts"

// Each map as its own module, imported the first time a map of it is drawn.
export const sheets: Record<Region["id"] | "world", () => Promise<{ readonly default: Sheet }>> = {
${["world", ...regions.map((region) => region.id)].map((id) => `  ${JSON.stringify(id)}: () => import("./${id}.gen.ts"),`).join("\n")}
}

export const national = {
${nations.map((nation) => `  ${nation.country}: () => import("./${nation.id}.gen.ts"),`).join("\n")}
} satisfies Partial<Record<Country, () => Promise<{ readonly default: Sheet }>>>

// Each map's footprint, known before the map loads, so a page can reserve its
// height.
// prettier-ignore
export const footprints: Readonly<Record<Region["id"] | "world" | keyof typeof national, Footprint>> = {
${footprints.map(([id, footprint]) => `  ${JSON.stringify(id)}: ${JSON.stringify(footprint)},`).join("\n")}
}
`,
)

const gaps = drawn.filter(({ uncoded }) => uncoded.length > 0)

writeFileSync(
  new URL("uncoded.gen.ts", import.meta.url),
  `// Generated by scripts/build-maps/index.ts. Do not edit.
import type { Country } from "../../src/countries.ts"

// The areas each national sheet publishes under its source's code, with no
// ISO 3166-2 code the build trusts: the source gives none, gives one the
// reference does not list for the country, gives one to two areas, or numbers
// its areas as ISO no longer does.
export const uncoded: Partial<Record<Country, ReadonlyArray<string>>> = {
${gaps.map(({ nation, uncoded }) => `  // ${nation.id}\n  ${nation.country}: [\n${uncoded.map(({ code, name }) => `    ${JSON.stringify(code)}, // ${name}`).join("\n")}\n  ],`).join("\n")}
}
`,
)

const areas = drawn.reduce((sum, { nation }) => sum + nation.codes.length, 0)
const kept = gaps.reduce((sum, { uncoded }) => sum + uncoded.length, 0)

console.info(
  `ISO 3166-2 codes for ${areas - kept} of ${areas} areas; ${kept} areas on ${gaps.length} sheets keep their source's code (scripts/build-maps/uncoded.gen.ts)`,
)

writeFileSync(
  new URL("../../test/places.gen.ts", import.meta.url),
  `// Generated by scripts/build-maps/index.ts. Do not edit.
// Where each landmark in scripts/build-maps/borders.ts falls on each sheet that
// frames it, in sheet units.
export const placed: Readonly<Record<string, Readonly<Record<string, readonly [number, number]>>>> =
  ${JSON.stringify(placed)}
`,
)
