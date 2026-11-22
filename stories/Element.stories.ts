import type { Meta, StoryObj } from "@storybook/html-vite"

import { MapChart } from "../src/element.ts"
import { regions } from "../src/index.ts"
import { illustrative } from "./figure.ts"

interface ElementArgs {
  // The JSON a model writes, as it would write it: any value, valid or not.
  readonly spec: unknown
  readonly scheme: "light" | "dark"
}

// `<map-chart>` as a model writes it in a page: JSON in a script, no code.
// The page's `color-scheme` picks the colours. A spec that does not parse
// shows what to fix and logs it to the console.
const meta = {
  title: "Maps/Element",
  args: { scheme: "light" },
  argTypes: { scheme: { control: "inline-radio", options: ["light", "dark"] } },
  render: ({ spec, scheme }) => {
    const page = document.createElement("div")
    const chart = new MapChart()
    const json = document.createElement("script")

    page.style.cssText = `color-scheme:${scheme};background:Canvas;color:CanvasText;max-width:900px;padding:16px;font-family:system-ui,sans-serif`
    json.type = "application/json"
    json.textContent = JSON.stringify(spec, null, 2)
    chart.append(json)
    page.append(chart)

    return page
  },
} satisfies Meta<ElementArgs>

export default meta

type Story = StoryObj<ElementArgs>

const europe = regions.find((region) => region.id === "europe")?.countries ?? []

export const Choropleth: Story = {
  args: {
    spec: {
      title: "Unemployment rate, %",
      source: "Illustrative values",
      fill: { kind: "choropleth", values: illustrative(europe, 1), better: "lower" },
    },
  },
}

export const Areas: Story = {
  args: {
    spec: {
      title: "Population, 2024 (millions)",
      source: "Illustrative values",
      fill: {
        kind: "choropleth",
        values: [
          { area: "US-CA", value: 39.4 },
          { area: "US-TX", value: 31.3 },
          { area: "US-FL", value: 23.4 },
          { area: "US-NY", value: 19.9 },
        ],
      },
    },
  },
}

export const Dark: Story = { args: { ...Choropleth.args, scheme: "dark" } }

// A layout's height depends on the outlines it crops, so the element
// reserves none: it takes its height once drawn.
export const Layout: Story = {
  args: {
    spec: {
      sheet: { places: ["USA", "FRA", "DEU", "ITA"], insets: false },
      fill: { kind: "highlight", countries: ["USA", "FRA", "DEU", "ITA"] },
    },
  },
}

// What a model reads back from the console, shown in place of the map.
export const Invalid: Story = {
  args: { spec: { titel: "Euro", fill: { kind: "highlight", countries: ["France", "DEU"] } } },
}
