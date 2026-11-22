import { spawn } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const cli = new URL("../src/cli.ts", import.meta.url).pathname

interface Run {
  readonly code: number | null
  readonly stdout: string
  readonly stderr: string
}

// The CLI as an agent's shell runs it: arguments, stdin, and what comes back.
const run = (args: ReadonlyArray<string>, stdin = ""): Promise<Run> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args])
    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("error", reject)
    child.on("close", (code) => resolve({ code, stdout, stderr }))
    child.stdin.end(stdin)
  })

const spec = JSON.stringify({
  title: "Euro area founders",
  fill: { kind: "highlight", countries: ["FRA", "DEU", "ITA", "ESP"] },
})

const file = (contents: string) => {
  const path = join(mkdtempSync(join(tmpdir(), "minimal-map-charts-")), "spec.json")

  writeFileSync(path, contents)

  return path
}

describe("minimal-map-charts render", () => {
  it("draws a spec file as SVG that follows the page's theme", async () => {
    const { code, stdout, stderr } = await run(["render", file(spec)])

    expect([code, stderr]).toEqual([0, ""])
    expect(stdout).toMatch(/^<svg [^>]*viewBox="0 0 1000 \d+"/)
    expect(stdout).toContain("<title>Euro area founders</title>")
    expect(stdout).toContain("light-dark(")
  })

  it("reads the spec from stdin", async () => {
    const { code, stdout } = await run(["render"], spec)

    expect(code).toBe(0)
    expect(stdout).toContain("<title>Euro area founders</title>")
  })

  it("paints a fixed palette with its own background", async () => {
    const { code, stdout } = await run(["render", "--palette", "dark"], spec)

    expect(code).toBe(0)
    expect(stdout).not.toContain("light-dark(")
    expect(stdout).toMatch(/<rect width="1000" height="\d+" fill="#1a1a19"\/>/)
  })

  it("prints what to fix to stderr and exits 1", async () => {
    const { code, stdout, stderr } = await run(
      ["render"],
      JSON.stringify({ titel: "Euro", fill: { kind: "highlight", countries: ["France"] } }),
    )

    expect([code, stdout]).toEqual([1, ""])
    expect(stderr.trim().split("\n")).toEqual([
      'spec: unknown key "titel".',
      'fill.countries.0: "France" is not a country code. Did you mean "FRA"?',
    ])
  })

  it("names an area the sheet does not draw, which only the loaded sheet knows", async () => {
    const { code, stdout, stderr } = await run(
      ["render"],
      JSON.stringify({ fill: { kind: "highlight", areas: ["US-CA", "US-ZZ"] } }),
    )

    expect([code, stdout]).toEqual([1, ""])
    expect(stderr).toBe('fill.areas.1: US-ZZ has no area on the "USA" sheet.\n')
  })

  it("refuses text that is not JSON", async () => {
    const { code, stderr } = await run(["render"], "{ title: Euro }")

    expect(code).toBe(1)
    expect(stderr).toMatch(/^spec: expected JSON\./)
  })

  it("names a file it cannot read", async () => {
    const { code, stderr } = await run(["render", "missing.json"])

    expect(code).toBe(1)
    expect(stderr).toMatch(/^missing\.json: ENOENT/)
  })

  it("shows its usage for a command it does not know and exits 2", async () => {
    const { code, stdout, stderr } = await run(["draw"])

    expect([code, stdout]).toEqual([2, ""])
    expect(stderr).toMatch(/^Usage: minimal-map-charts render/)
  })
})
