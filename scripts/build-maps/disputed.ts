// Writes scripts/build-maps/disputed.json: Natural Earth's outline of each
// disputed area borders.ts lists, from its 1:10m disputed areas, v5.1.2
// (public domain):
//
//   curl -LO https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_disputed_areas.geojson
//   node scripts/build-maps/disputed.ts ne_10m_admin_0_disputed_areas.geojson && oxfmt scripts/build-maps/disputed.json
//
// An area Natural Earth also draws as a country of its own, such as
// Somaliland, moves whole; its outline here only cuts out what the
// neighbours' outlines draw inside it.
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"

import { Schema } from "effect"

import { areas, disputed, pairs } from "./borders.ts"
import { geometry } from "./geojson.ts"

const source =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_disputed_areas.geojson"

const sha256 = "9cafef8b7dfb6b164dc58f218f981f4ace9f716f6c03795d4c62d1ac9f3d50f5"

const Areas = Schema.Struct({
  features: Schema.Array(
    Schema.Struct({ properties: Schema.Struct({ BRK_NAME: Schema.String }), geometry }),
  ),
})

const input = process.argv[2]

if (input === undefined) throw new Error("Usage: node scripts/build-maps/disputed.ts <geojson>")

const text = readFileSync(input, "utf8")
const digest = createHash("sha256").update(text).digest("hex")

if (digest !== sha256) throw new Error(`Expected ${source} (sha256 ${sha256}), got ${digest}`)

const features = Schema.decodeUnknownSync(Areas)(JSON.parse(text)).features

// Ten-thousandths of a degree, about 10 m: finer than any sheet draws.
const round = (value: number) => Math.round(value * 1e4) / 1e4

const found = areas.flatMap(({ name }) => {
  const shapes = features
    .filter((feature) => feature.properties.BRK_NAME.trim() === name)
    .flatMap(({ geometry: shape }) =>
      shape.type === "Polygon" ? [pairs(shape.coordinates)] : shape.coordinates.map(pairs),
    )
    .map((shape) => shape.map((ring) => ring.map(([x, y]) => [round(x), round(y)])))

  return shapes.length === 0 ? [] : [[name, shapes] as const]
})

writeFileSync(disputed, `${JSON.stringify({ source, sha256, areas: Object.fromEntries(found) })}\n`)

console.info(
  `Wrote ${found.map(([name]) => name).join(", ")}. Not in the source: ${
    areas
      .map(({ name }) => name)
      .filter((name) => !found.some(([each]) => each === name))
      .join(", ") || "none"
  }`,
)
