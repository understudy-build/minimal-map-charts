#!/usr/bin/env node
/// <reference types="node" />
// `minimal-map-charts render [spec.json]`: draws a spec as SVG on stdout, for
// an agent with a shell. Without a file it reads the spec from stdin. A spec
// that does not parse prints its problems to stderr and exits 1.
import { readFile } from "node:fs/promises"
import { text } from "node:stream/consumers"
import { parseArgs } from "node:util"

import { render } from "./render.ts"
import { dark, light } from "./svg.ts"

const usage = `Usage: minimal-map-charts render [spec.json] [--palette light|dark]

Draws a map spec as SVG on stdout. Without spec.json, reads the spec from stdin.
The SVG follows the page's color-scheme; --palette paints a fixed light or dark
map with its own background, for an image or an email.`

const palettes = { light, dark } as const

const fail = (message: string, code: number) => {
  process.stderr.write(`${message}\n`)
  process.exitCode = code
}

const run = async () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { palette: { type: "string" }, help: { type: "boolean", short: "h" } },
  })

  if (values.help === true) {
    process.stdout.write(`${usage}\n`)
    return
  }

  const [command, file, ...extra] = positionals
  const { palette } = values

  if (command !== "render" || extra.length > 0) return fail(usage, 2)
  if (palette !== undefined && palette !== "light" && palette !== "dark")
    return fail(`--palette: expected "light" or "dark", not "${palette}".\n\n${usage}`, 2)

  let input: string

  try {
    input =
      file === undefined || file === "-" ? await text(process.stdin) : await readFile(file, "utf8")
  } catch (error) {
    return fail(`${file}: ${error instanceof Error ? error.message : String(error)}`, 1)
  }

  const drawn = await render(input, palette === undefined ? {} : { palette: palettes[palette] })

  if (!drawn.ok) return fail(drawn.lines.join("\n"), 1)

  process.stdout.write(`${drawn.svg}\n`)
}

try {
  await run()
} catch (error) {
  // parseArgs refuses an unknown option.
  fail(`${error instanceof Error ? error.message : String(error)}\n\n${usage}`, 2)
}
