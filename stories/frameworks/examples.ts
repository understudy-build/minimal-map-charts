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

// Offices named by their city, and one Natural Earth does not list at its
// coordinates, sized by staff over a highlight, with one in an inset.
export const offices: Spec = {
  title: "Staff by office",
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
      { place: "Las Palmas", country: "ESP", value: 30 },
      { name: "Sophia Antipolis", lat: 43.62, lon: 7.05, value: 25 },
    ],
  },
}
