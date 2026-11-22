import { regions, type Spec } from "../../src/index.ts"
import { illustrative } from "../figure.ts"

// The specs every framework's stories draw, so their maps compare.

const europe = regions.find((region) => region.id === "europe")?.countries ?? []

export const growth: Spec = {
  title: "GDP growth, 2024 (%)",
  source: "Illustrative values",
  fill: { kind: "choropleth", values: illustrative(europe, 3), better: "higher" },
}

// A model's tool call, before `parse` has checked it.
export const output: unknown = {
  title: "Internet users, % of population",
  fill: {
    kind: "choropleth",
    values: [
      { country: "JPN", value: 83 },
      { country: "KOR", value: 97 },
      { country: "CHN", value: 76 },
      { country: "MNG", value: 84 },
      { country: "PRK", value: 0.1 },
    ],
    better: "higher",
  },
}
