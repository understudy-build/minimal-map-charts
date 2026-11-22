// Writes the README's example maps to docs/images/, drawn by the package
// itself from the specs the README shows. Run with `pnpm readme`.
import { mkdirSync, writeFileSync } from "node:fs"

import { describe, draw, parse, svg } from "../src/index.ts"

const examples: Readonly<Record<string, unknown>> = {
  // What a model sends: the subject only. Membership is a fact it knows;
  // there are no values for it to invent.
  euro: {
    title: "Euro area members, 2026",
    fill: {
      kind: "highlight",
      countries: [
        "AUT",
        "BEL",
        "BGR",
        "HRV",
        "CYP",
        "EST",
        "FIN",
        "FRA",
        "DEU",
        "GRC",
        "IRL",
        "ITA",
        "LVA",
        "LTU",
        "LUX",
        "MLT",
        "NLD",
        "PRT",
        "SVK",
        "SVN",
        "ESP",
      ],
    },
  },
  // A layout: two panels an ocean apart, a kilometre as long in both.
  comparison: {
    sheet: { places: ["USA", "GBR", "FRA", "ESP", "BEL", "NLD", "DEU", "ITA"], insets: false },
    title: "GDP growth, 2024 (%)",
    source: "Illustrative values",
    fill: {
      kind: "choropleth",
      values: [
        { country: "USA", value: 2.8 },
        { country: "GBR", value: 1.1 },
        { country: "FRA", value: 1.1 },
        { country: "ESP", value: 3.2 },
        { country: "BEL", value: 1 },
        { country: "NLD", value: 0.9 },
        { country: "DEU", value: -0.2 },
        { country: "ITA", value: 0.7 },
      ],
      better: "higher",
    },
  },
}

const folder = new URL("../docs/images/", import.meta.url).pathname

mkdirSync(folder, { recursive: true })

await Promise.all(
  Object.entries(examples).map(async ([name, input]) => {
    const parsed = parse(input)

    if (!parsed.ok) throw new Error(`${name}: ${parsed.issues.map(describe).join(" ")}`)

    writeFileSync(`${folder}${name}.svg`, svg(await draw(parsed.spec)))
  }),
)

console.info(`Wrote ${Object.keys(examples).length} maps to docs/images/`)
