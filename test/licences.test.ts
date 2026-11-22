import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { licences, terms } from "../src/credit.ts"
import { cite, sheetIds, svg } from "../src/index.ts"
import { drawn } from "./values.ts"

// Every source of every sheet, with the sheet that credits it.
const sources = async () => {
  const sheets = await Promise.all(
    sheetIds.map(async (sheet) =>
      (await drawn({ sheet })).credits.map((credit) => ({ sheet, credit })),
    ),
  )

  return sheets.flat()
}

// LICENSE.md's table rows: sheet code to the licences it lists.
const listed = () =>
  new Map(
    readFileSync(new URL("../LICENSE.md", import.meta.url), "utf8")
      .split("\n")
      .map((line) => line.split("|").map((cell) => cell.trim()))
      .filter((cells) => /^[A-Z]{3}$/.test(cells[1] ?? ""))
      .map((cells) => [cells[1], cells[4]] as const),
  )

describe("sheet licences", () => {
  it("names only licences whose terms the credit line knows", async () => {
    const unknown = (await sources()).flatMap(({ sheet, credit }) =>
      credit.license
        .split("; ")
        .filter((name) => !Object.hasOwn(licences, name))
        .map((name) => `${sheet}: ${name}`),
    )

    expect(unknown).toEqual([])
  })

  it("lists each sheet's licences in LICENSE.md", async () => {
    const credited = (await sources())
      .filter(({ credit }) => credit.publisher !== "Natural Earth")
      .map(
        ({ sheet, credit }) =>
          [
            sheet,
            terms(credit)
              .map((term) => term.name)
              .join("; "),
          ] as const,
      )

    expect(listed()).toEqual(new Map(credited))
  })
})

describe("a map's credits", () => {
  it("print a share-alike source with its licence and where its derived data is", async () => {
    const scene = await drawn({ sheet: "DZA" })
    const shared = scene.credits.find((credit) => credit.license === "ODbL 1.0")
    const line = shared === undefined ? "" : cite(shared)
    const notes = [...svg(scene).matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((match) => match[1])

    expect(line).toContain("simplified and re-projected")
    expect(line).toContain("ODbL 1.0: opendatacommons.org/licenses/odbl/1-0")
    expect(line).toContain("Derived data: npmjs.com/package/@nicolastoulemont/minimal-map-charts")
    // Too long for one line under the map, it wraps at spaces.
    expect(notes.join(" ")).toContain(line)
    expect(notes).not.toContain(line)
  })
})
