// Writes the example maps of the README and docs/maps.md to docs/images/, drawn
// by the package itself from the specs they show. Run with `pnpm readme`.
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
  // A country's areas: ISO 3166-2 codes draw the United States sheet.
  states: {
    title: "Population density, 2020 (people per square mile)",
    source: "U.S. Census Bureau, 2020 Census",
    fill: {
      kind: "choropleth",
      values: [
        { area: "US-AL", value: 99 },
        { area: "US-AK", value: 1.3 },
        { area: "US-AZ", value: 63 },
        { area: "US-AR", value: 58 },
        { area: "US-CA", value: 254 },
        { area: "US-CO", value: 56 },
        { area: "US-CT", value: 745 },
        { area: "US-DE", value: 508 },
        { area: "US-DC", value: 11280 },
        { area: "US-FL", value: 401 },
        { area: "US-GA", value: 187 },
        { area: "US-HI", value: 227 },
        { area: "US-ID", value: 22 },
        { area: "US-IL", value: 231 },
        { area: "US-IN", value: 189 },
        { area: "US-IA", value: 57 },
        { area: "US-KS", value: 36 },
        { area: "US-KY", value: 114 },
        { area: "US-LA", value: 108 },
        { area: "US-ME", value: 44 },
        { area: "US-MD", value: 636 },
        { area: "US-MA", value: 901 },
        { area: "US-MI", value: 178 },
        { area: "US-MN", value: 72 },
        { area: "US-MS", value: 63 },
        { area: "US-MO", value: 90 },
        { area: "US-MT", value: 7.4 },
        { area: "US-NE", value: 26 },
        { area: "US-NV", value: 28 },
        { area: "US-NH", value: 154 },
        { area: "US-NJ", value: 1263 },
        { area: "US-NM", value: 18 },
        { area: "US-NY", value: 429 },
        { area: "US-NC", value: 215 },
        { area: "US-ND", value: 11 },
        { area: "US-OH", value: 289 },
        { area: "US-OK", value: 58 },
        { area: "US-OR", value: 44 },
        { area: "US-PA", value: 291 },
        { area: "US-RI", value: 1061 },
        { area: "US-SC", value: 170 },
        { area: "US-SD", value: 12 },
        { area: "US-TN", value: 168 },
        { area: "US-TX", value: 112 },
        { area: "US-UT", value: 40 },
        { area: "US-VT", value: 70 },
        { area: "US-VA", value: 219 },
        { area: "US-WA", value: 116 },
        { area: "US-WV", value: 75 },
        { area: "US-WI", value: 109 },
        { area: "US-WY", value: 6 },
      ],
      scale: { kind: "breaks", at: [10, 50, 100, 200, 500] },
    },
  },
  // Points: offices named by their city, and one Natural Earth does not
  // list at its coordinates, sized by staff over a highlight.
  offices: {
    title: "Staff by office, 2026",
    source: "Illustrative values",
    fill: { kind: "highlight", countries: ["FRA", "DEU", "GBR", "ESP"] },
    points: {
      kind: "bubble",
      label: "Staff",
      sites: [
        { place: "Paris", country: "FRA", value: 420 },
        { place: "London", country: "GBR", value: 260 },
        { place: "Berlin", country: "DEU", value: 130 },
        { place: "Madrid", country: "ESP", value: 75 },
        { place: "Lyon", country: "FRA", value: 40 },
        { name: "Sophia Antipolis", lat: 43.62, lon: 7.05, value: 25 },
      ],
    },
  },
}

const folder = new URL("../docs/images/", import.meta.url).pathname

mkdirSync(folder, { recursive: true })

await Promise.all(
  Object.entries(examples).map(async ([name, input]) => {
    const parsed = parse(input)

    const drawn = parsed.ok ? await draw(parsed.spec) : parsed

    if (!drawn.ok) throw new Error(`${name}: ${drawn.issues.map(describe).join(" ")}`)

    writeFileSync(`${folder}${name}.svg`, svg(drawn.scene))
  }),
)

console.info(`Wrote ${Object.keys(examples).length} maps to docs/images/`)
