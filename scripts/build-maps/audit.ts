// Reports where the sheets disagree on who holds land: the world and region
// sheets' Natural Earth outlines (atlas.ts, at 1:50m) against each national
// sheet's subdivisions (sources.ts), both as drawn once borders.ts has
// settled disputed land. Every source is rasterized once onto a
// grid of 0.1° cells, then compared cell by cell. Run with
// `pnpm audit:borders`, after `pnpm build:maps` has restored the snapshots.
//
// With Natural Earth's disputed areas, it also says who each sheet draws in
// each of them:
//
//   curl -LO https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_disputed_areas.geojson
//   pnpm audit:borders ne_10m_admin_0_disputed_areas.geojson
//
// Two publishers rarely draw a shared border on the same line, so land
// along most borders is drawn by both. A group of cells counts only once its
// core, the cells all of whose sides touch the group, covers `least` km².
import { readFileSync } from "node:fs"

import { Schema } from "effect"

import { outlines } from "./atlas.ts"
import { geometry } from "./geojson.ts"
import { nations } from "./nations.ts"
import { cellArea, centre, grid, groups, neighbours, rasterize } from "./raster.ts"
import { read } from "./sources.ts"

const least = 300

const cells = grid(0.1)

// Who the world and region sheets draw in each cell: a World Bank code, or a
// Natural Earth name in brackets for land with none.
const outlined = new Map<number, string>()

for (const { name, code, shapes } of outlines)
  for (const cell of rasterize(cells, { type: "MultiPolygon", coordinates: [...shapes] }))
    outlined.set(cell, code ?? `(${name})`)

// Which countries' national sheets draw each cell.
const national = new Map<number, Set<string>>()
const sheeted = new Set<string>(nations.map((nation) => nation.country))

for (const nation of nations)
  for (const land of read(nation).lands)
    if (nation.codes.includes(land.properties.code))
      for (const cell of rasterize(cells, land.geometry)) {
        const holders = national.get(cell)

        if (holders === undefined) national.set(cell, new Set([nation.country]))
        else holders.add(nation.country)
      }

const area = (group: Iterable<number>) => {
  let sum = 0

  for (const cell of group) sum += cellArea(cells, Math.floor(cell / cells.columns))

  return sum
}

const km2 = (value: number) => `${Math.round(value).toLocaleString("en")} km²`

const where = (group: ReadonlyArray<number>) => {
  const points = group.map((cell) => centre(cells, cell))
  const [x, y] = points.reduce(([sx, sy], [px, py]) => [sx + px, sy + py], [0, 0])

  return `${(x / points.length).toFixed(1)}, ${(y / points.length).toFixed(1)}`
}

// Natural Earth's disputed areas, if given, to name the groups found.
const Disputes = Schema.Struct({
  features: Schema.Array(
    Schema.Struct({
      properties: Schema.Struct({
        BRK_NAME: Schema.String,
        NOTE_BRK: Schema.NullOr(Schema.String),
      }),
      geometry,
    }),
  ),
})

const disputes =
  process.argv[2] === undefined
    ? []
    : Schema.decodeUnknownSync(Disputes)(
        JSON.parse(readFileSync(process.argv[2], "utf8")),
      ).features.map(({ properties, geometry: shape }) => ({
        name: properties.BRK_NAME.trim(),
        note: properties.NOTE_BRK ?? "",
        cells: rasterize(cells, shape),
      }))

const named = (group: ReadonlyArray<number>) => {
  const scores = disputes
    .map((dispute) => ({ dispute, shared: group.filter((cell) => dispute.cells.has(cell)).length }))
    .filter(({ shared }) => shared > group.length / 4)
    .toSorted((a, b) => b.shared - a.shared)

  return scores[0] === undefined ? "" : ` (${scores[0].dispute.name})`
}

// The groups of each kind of cell whose core covers `least`, largest first.
const report = (title: string, kinds: ReadonlyMap<string, Set<number>>) => {
  console.info(`\n## ${title}\n`)

  const found = [...kinds].flatMap(([kind, members]) =>
    groups(cells, members).flatMap((group) => {
      const core = group.filter((cell) =>
        neighbours(cells, cell).every((next) => members.has(next)),
      )

      return area(core) >= least ? [{ kind, group, core: area(core), total: area(group) }] : []
    }),
  )

  for (const { kind, group, core, total } of found.toSorted((a, b) => b.core - a.core))
    console.info(
      `- ${kind}${named(group)}: ${km2(total)}, core ${km2(core)}, around ${where(group)}`,
    )

  if (found.length === 0) console.info("None.")
}

const add = (kinds: Map<string, Set<number>>, kind: string, cell: number) => {
  const members = kinds.get(kind)

  if (members === undefined) kinds.set(kind, new Set([cell]))
  else members.add(cell)
}

const twice = new Map<string, Set<number>>()
const moved = new Map<string, Set<number>>()
const dropped = new Map<string, Set<number>>()

for (const [cell, holders] of national) {
  const sorted = [...holders].toSorted()

  for (const [index, one] of sorted.entries())
    for (const other of sorted.slice(index + 1)) add(twice, `${one} and ${other}`, cell)

  const outline = outlined.get(cell)

  if (outline !== undefined)
    for (const holder of holders)
      if (holder !== outline) add(moved, `${holder} sheet, ${outline} on the atlas`, cell)
}

for (const [cell, outline] of outlined)
  if (sheeted.has(outline) && !national.has(cell)) add(dropped, `${outline} on the atlas`, cell)

console.info("# Borders audit")

report("Land two national sheets draw", twice)
report("Land a national sheet draws where the atlas has another country", moved)
report("Land the atlas gives a country with a national sheet that no national sheet draws", dropped)

// Each holder's share of the cells, at least 5%, largest first. A cell can
// have more than one holder, so the shares can add up to more than 100%.
const shares = (members: ReadonlyArray<number>, holders: (cell: number) => Iterable<string>) => {
  const counts = new Map<string, number>()

  for (const cell of members)
    for (const holder of holders(cell)) counts.set(holder, (counts.get(holder) ?? 0) + 1)

  const listed = [...counts]
    .map(([holder, count]) => [holder, count / members.length] as const)
    .filter(([, share]) => share >= 0.05)
    .toSorted((a, b) => b[1] - a[1])
    .map(([holder, share]) => `${holder} ${Math.round(share * 100)}%`)

  return listed.length === 0 ? "none" : listed.join(", ")
}

if (disputes.length > 0) {
  console.info("\n## Who each sheet draws in Natural Earth's disputed areas\n")

  for (const { name, note, cells: members } of disputes)
    if (members.size >= 3) {
      const all = [...members]
      const atlased = shares(all, (cell) => [outlined.get(cell) ?? "sea"])
      const drawn = shares(all, (cell) => national.get(cell) ?? ["none"])

      console.info(
        `- ${name}${note === "" ? "" : ` (${note})`}, ${km2(area(all))}: atlas ${atlased}; national ${drawn}`,
      )
    }
}
