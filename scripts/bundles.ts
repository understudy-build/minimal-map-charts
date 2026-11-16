// Bundles the built package the way an app would, with tree-shaking and
// minification, and measures what common maps cost a page: the code an app
// imports plus the one sheet it draws.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { brotliCompressSync, constants, gzipSync } from "node:zlib"

import { build, type Rollup } from "vite"

export interface Weight {
  readonly min: number
  readonly gzip: number
  readonly brotli: number
}

const weigh = (code: string): Weight => {
  const bytes = Buffer.from(code)

  return {
    min: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  }
}

const add = (left: Weight, right: Weight): Weight => ({
  min: left.min + right.min,
  gzip: left.gzip + right.gzip,
  brotli: left.brotli + right.brotli,
})

const none: Weight = { min: 0, gzip: 0, brotli: 0 }

// What an app imports from the package.
export interface Imports {
  readonly name: string
  readonly names: ReadonlyArray<string>
}

export const imports: ReadonlyArray<Imports> = [
  { name: "Render", names: ["draw", "svg"] },
  { name: "Generative UI", names: ["parse", "schema", "draw", "svg"] },
]

export interface Bundle {
  readonly imports: Imports
  // The code a page loads before drawing: the entry chunk and its static imports.
  readonly code: Weight
  // Each sheet's chunk, by the module file it was built from, e.g. "europe.gen.js".
  readonly sheets: ReadonlyMap<string, Weight>
}

const chunks = (output: Rollup.RollupOutput) =>
  output.output.filter((item): item is Rollup.OutputChunk => item.type === "chunk")

// Bundles an app entry that uses `names` and draws a sheet chosen at run time.
export const bundle = async (dist: string, used: Imports): Promise<Bundle> => {
  const folder = mkdtempSync(join(tmpdir(), "minimal-maps-"))
  const entry = join(folder, "app.js")

  writeFileSync(
    entry,
    `import { ${used.names.join(", ")} } from ${JSON.stringify(join(dist, "index.js"))}\n` +
      `globalThis.app = { ${used.names.join(", ")} }\n`,
  )

  try {
    const result = await build({
      configFile: false,
      logLevel: "silent",
      root: folder,
      build: {
        write: false,
        minify: true,
        modulePreload: { polyfill: false },
        rollupOptions: { input: entry },
      },
    })

    const output = Array.isArray(result) ? result[0] : result

    if (output === undefined || !("output" in output)) throw new Error("Vite returned no output")

    const all = chunks(output)
    const byName = new Map(all.map((chunk) => [chunk.fileName, chunk]))
    const start = all.find((chunk) => chunk.isEntry)

    if (start === undefined) throw new Error("No entry chunk")

    // The entry and every chunk it imports statically.
    const loaded = new Set<string>()
    const queue = [start.fileName]

    for (let name = queue.pop(); name !== undefined; name = queue.pop()) {
      if (loaded.has(name)) continue

      loaded.add(name)
      queue.push(...(byName.get(name)?.imports ?? []))
    }

    const code = [...loaded].reduce(
      (sum, name) => add(sum, weigh(byName.get(name)?.code ?? "")),
      none,
    )

    const sheets = new Map(
      all.flatMap((chunk) => {
        const source = chunk.facadeModuleId ?? ""
        const file = source.slice(source.lastIndexOf("/") + 1)

        return file.endsWith(".gen.js") && !loaded.has(chunk.fileName)
          ? [[file, weigh(chunk.code)] as const]
          : []
      }),
    )

    return { imports: used, code, sheets }
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}

// The module file each sheet id loads, read from the registry's import() calls.
export const files = (registry: string): ReadonlyMap<string, string> =>
  new Map(
    [
      ...readFileSync(registry, "utf8").matchAll(
        /^\s*"?([\w-]+)"?: \(\) =>\s*import\("\.\/([\w-]+)\.gen\.js"\)/gm,
      ),
    ].flatMap(([, id, file]) =>
      id === undefined || file === undefined ? [] : [[id, `${file}.gen.js`] as const],
    ),
  )

export { add }
