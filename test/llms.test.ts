import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { describe as explain, parse } from "../src/index.ts"

const page = readFileSync(new URL("../llms.txt", import.meta.url), "utf8")
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))

const blocks = (language: string) =>
  [...page.matchAll(new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\`\`\``, "g"))].map(
    ([, body = ""]) => body,
  )

// What parse says of a spec: nothing when it is valid.
const issues = (text: string) => {
  const parsed = parse(JSON.parse(text))

  return parsed.ok ? [] : parsed.issues.map(explain)
}

describe("llms.txt", () => {
  it("shows only specs that parse", () => {
    const specs = [
      ...blocks("json"),
      ...blocks("html").flatMap((html) =>
        [...html.matchAll(/<script type="application\/json">([\s\S]*?)<\/script>/g)].map(
          ([, json = ""]) => json,
        ),
      ),
    ]

    expect(specs).toHaveLength(5)
    for (const spec of specs) expect(issues(spec)).toEqual([])
  })

  it("loads the element from this major version", () => {
    const [major] = version.split(".")

    expect(page).toContain(`minimal-map-charts@${major}/dist/element.js`)
  })
})
