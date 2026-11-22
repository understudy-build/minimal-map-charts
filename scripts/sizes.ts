// Writes docs/bundle-size.md: the size of every file in dist/, raw and
// compressed, and what a page downloads before it draws a sheet; and the
// README's size table. Run with `pnpm sizes`, which builds first.
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import { brotliCompressSync, constants, gzipSync } from "node:zlib"

import { regions } from "../src/regions.ts"
import { add, bundle, files as registry, imports, type Weight } from "./bundles.ts"

const root = new URL("..", import.meta.url).pathname
const dist = join(root, "dist")

interface Size {
  readonly path: string
  readonly raw: number
  readonly gzip: number
  readonly brotli: number
}

const files = (folder: string): ReadonlyArray<string> =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(folder, entry.name)) : [join(folder, entry.name)],
  )

const measure = (file: string): Size => {
  const bytes = readFileSync(file)

  return {
    path: relative(dist, file),
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  }
}

const all = files(dist).map(measure)
const scripts = all.filter((size) => size.path.endsWith(".js"))
const declarations = all.filter((size) => size.path.endsWith(".d.ts"))
// Each country's places, loaded when a spec names a place there.
const places = scripts.filter((size) => size.path.startsWith("data/places/"))
// The registries of sheets and places and the layouts' country table are
// data, not sheets.
const sheets = scripts.filter(
  (size) =>
    size.path.startsWith("data/") &&
    !places.includes(size) &&
    !["data/sheets.gen.js", "data/globe.gen.js", "data/places.gen.js"].includes(size.path),
)
const core = scripts.filter((size) => !sheets.includes(size) && !places.includes(size))

// The modules a page loads with the entry point: every file index.js reaches
// through static imports. Sheets load later through import(), so they are not
// in it.
const reached = (start: string): ReadonlySet<string> => {
  const seen = new Set<string>()
  const queue = [start]

  for (let path = queue.pop(); path !== undefined; path = queue.pop()) {
    if (seen.has(path)) continue

    seen.add(path)

    const source = readFileSync(join(dist, path), "utf8")
    const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""

    for (const [, target] of source.matchAll(/^(?:import|export)\s[^;]*?from\s+"(\.[^"]+)"/gm))
      if (target !== undefined) queue.push(relative(dist, join(dist, folder, target)))
  }

  return seen
}

const entry = reached("index.js")
const loaded = scripts.filter((size) => entry.has(size.path))
// What a page loads from a CDN for `<map-chart>`, before its sheet.
const element = reached("element.js")
const elementLoaded = scripts.filter((size) => element.has(size.path))

const total = (sizes: ReadonlyArray<Size>): Size => ({
  path: `${sizes.length} files`,
  raw: sizes.reduce((sum, size) => sum + size.raw, 0),
  gzip: sizes.reduce((sum, size) => sum + size.gzip, 0),
  brotli: sizes.reduce((sum, size) => sum + size.brotli, 0),
})

const kb = (bytes: number) => `${(bytes / 1000).toFixed(1)} kB`

const table = (rows: ReadonlyArray<Size>, label: string) =>
  [
    `| ${label} | Raw | gzip | Brotli |`,
    "|---|---:|---:|---:|",
    ...rows.map((row) => `| ${row.path} | ${kb(row.raw)} | ${kb(row.gzip)} | ${kb(row.brotli)} |`),
  ].join("\n")

const byGzip = (sizes: ReadonlyArray<Size>) =>
  sizes.toSorted((left, right) => right.gzip - left.gzip)
// Sheets by kind: the world, the regions, and countries' own maps.
const regionFiles = new Set(regions.map((region) => `data/${region.id}.gen.js`))

const kinds = [
  { name: "World", sheets: sheets.filter((size) => size.path === "data/world.gen.js") },
  { name: "Regions", sheets: sheets.filter((size) => regionFiles.has(size.path)) },
  {
    name: "Countries",
    sheets: sheets.filter(
      (size) => size.path !== "data/world.gen.js" && !regionFiles.has(size.path),
    ),
  },
]

const summary = (group: ReadonlyArray<Size>) => {
  const median = byGzip(group)[Math.floor(group.length / 2)]

  return group.length === 1
    ? `1 sheet, ${kb(total(group).gzip)} gzipped.`
    : `${group.length} sheets, ${kb(total(group).gzip)} gzipped in total. The median sheet is ${kb(median?.gzip ?? 0)} gzipped.`
}

const kindSections = kinds
  .map(
    (kind) =>
      `### ${kind.name}\n\n${summary(kind.sheets)}\n\n${table(byGzip(kind.sheets), "Sheet")}`,
  )
  .join("\n\n")

const others = byGzip(
  core.filter((size) => !entry.has(size.path) && !element.has(size.path) && size.path !== "cli.js"),
)

// Common maps, bundled the way an app would bundle them. "Asia" draws East
// Asia: no sheet holds the whole continent, and a fill across it draws the
// world.
const cases = [
  { name: "World", sheet: "world" },
  { name: "North America", sheet: "north-america" },
  { name: "Europe", sheet: "europe" },
  { name: "Asia (East Asia)", sheet: "east-asia" },
  { name: "United States", sheet: "USA" },
  { name: "France", sheet: "FRA" },
  { name: "Germany", sheet: "DEU" },
  { name: "China", sheet: "CHN" },
  { name: "Japan", sheet: "JPN" },
] as const

const bundles = await Promise.all(imports.map((used) => bundle(dist, used)))
const sheetFiles = registry(join(dist, "data", "sheets.gen.js"))

const sheetOf = (id: string): Weight => {
  const file = sheetFiles.get(id)
  const weight = file === undefined ? undefined : bundles[0]?.sheets.get(file)

  if (weight === undefined) throw new Error(`No bundled chunk for sheet ${id}`)

  return weight
}

const codeTable = [
  "| Imports | Names | Minified | gzip | Brotli |",
  "|---|---|---:|---:|---:|",
  ...bundles.map(
    ({ imports: used, code }) =>
      `| ${used.name} | ${used.names.map((name) => `\`${name}\``).join(", ")} | ${kb(code.min)} | ${kb(code.gzip)} | ${kb(code.brotli)} |`,
  ),
].join("\n")

const caseTable = [
  `| Map | Sheet | Sheet, gzip | ${bundles.map(({ imports: used }) => `${used.name}, gzip`).join(" | ")} | ${bundles.map(({ imports: used }) => `${used.name}, Brotli`).join(" | ")} |`,
  `|---|---|---:|${bundles.map(() => "---:").join("|")}|${bundles.map(() => "---:").join("|")}|`,
  ...cases.map(({ name, sheet }) => {
    const weight = sheetOf(sheet)
    const totals = bundles.map(({ code }) => add(code, weight))

    return `| ${name} | \`${sheet}\` | ${kb(weight.gzip)} | ${totals.map((sum) => kb(sum.gzip)).join(" | ")} | ${totals.map((sum) => kb(sum.brotli)).join(" | ")} |`
  }),
].join("\n")

const markdown = `# Bundle size

Generated by \`scripts/sizes.ts\` from \`dist/\`. Do not edit; run \`pnpm sizes\`.

Each file is compressed on its own (gzip level 9, Brotli quality 11), as a server sends it. 1 kB is 1,000 bytes.

## What a page loads

Importing the package loads the entry point and every module it imports statically. Each sheet is a separate module loaded with \`import()\` the first time a map draws it, so a page that draws one map adds one sheet.

${table([...byGzip(loaded), { ...total(loaded), path: "**Total**" }], "Entry point")}

A bundler may merge these modules and minify them, so a bundled page usually sends less than this.

## The \`<map-chart>\` element

A page that loads \`dist/element.js\` from a CDN downloads these modules, unbundled, then the one sheet its map draws.

${table([...byGzip(elementLoaded), { ...total(elementLoaded), path: "**Total**" }], "Module")}

## Common maps, bundled

What a page downloads to draw one map when an app bundles the package with Vite (Rolldown), which tree-shakes the exports it does not use and minifies the rest. Each sheet stays its own chunk, loaded when the map is drawn, so a page pays for the code it imports plus the one sheet it shows.

The code an app imports:

${codeTable}

Each map adds its sheet. The totals are that code plus the sheet:

${caseTable}

"Asia" draws the East Asia sheet: no sheet holds the whole continent, and a fill across it draws the world.

## Sheets

${summary(sheets)}

${kindSections}

## Places

Each country's places are one module, loaded with \`import()\` the first time a point names a place in that country, through the registry \`data/places.gen.js\`. A map whose points all give coordinates loads none. ${places.length} countries, ${kb(total(places).gzip)} gzipped in total. The median country is ${kb(byGzip(places)[Math.floor(places.length / 2)]?.gzip ?? 0)} gzipped. The ten largest:

${table(byGzip(places).slice(0, 10), "Country")}

${others.length === 0 ? "" : `## Other modules\n\nModules the entry point does not import.\n\n${table(others, "Module")}\n\n`}## Type declarations\n\n${declarations.length} \`.d.ts\` files, ${kb(total(declarations).raw)} raw. They are used by editors and type checkers, never downloaded by a page.
`

writeFileSync(join(root, "docs", "bundle-size.md"), markdown)

// The README's size table, written between `<!-- name -->` and `<!-- /name -->`.
const [render, generative] = bundles

if (render === undefined || generative === undefined) throw new Error("Expected two bundles")

const mapTable = [
  "| Map | Sheet, gzip | With `draw` and `svg`, gzip | With `parse` and `schema` too, gzip |",
  "|---|---:|---:|---:|",
  ...cases.map(({ name, sheet }) => {
    const weight = sheetOf(sheet)

    return `| ${name} | ${kb(weight.gzip)} | ${kb(add(render.code, weight).gzip)} | ${kb(add(generative.code, weight).gzip)} |`
  }),
].join("\n")

const fill = (text: string, name: string, body: string) => {
  const block = new RegExp(`(<!-- ${name} -->)[\\s\\S]*?(<!-- /${name} -->)`)

  if (!block.test(text)) throw new Error(`README.md has no ${name} block`)

  return text.replace(block, (_, open: string, close: string) => `${open}\n\n${body}\n\n${close}`)
}

const readme = join(root, "README.md")

writeFileSync(readme, fill(readFileSync(readme, "utf8"), "sizes:maps", mapTable))

console.info(
  `Wrote docs/bundle-size.md and README.md: ${scripts.length} scripts, ${declarations.length} declarations`,
)
