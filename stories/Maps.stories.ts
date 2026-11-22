import type { Meta, StoryObj } from "@storybook/html-vite"

import { draw, regions, sheetIds, type SheetId, type Spec } from "../src/index.ts"
import { figure, illustrative, palettes } from "./figure.ts"

interface MapArgs {
  readonly spec: Spec
  readonly locale: string
  readonly palette: keyof typeof palettes
}

const europe = regions.find((region) => region.id === "europe")?.countries ?? []

const meta = {
  title: "Maps/Use cases",
  args: { spec: {}, locale: "en", palette: "light" },
  argTypes: {
    palette: { control: "inline-radio", options: Object.keys(palettes) },
    locale: { control: "select", options: ["en", "fr", "de", "ja", "ar"] },
  },
  loaders: [async ({ args }) => ({ scene: await draw(args.spec, { locale: args.locale }) })],
  render: (args, { loaded }) => figure(loaded["scene"], { palette: palettes[args.palette] }),
} satisfies Meta<MapArgs>

export default meta

type Story = StoryObj<MapArgs>

// The dominant case: values by country, no sheet. The map frames Europe
// because every country in the fill is European.
export const Choropleth: Story = {
  args: {
    spec: {
      title: "Unemployment rate, %",
      source: "Illustrative values",
      fill: { kind: "choropleth", values: illustrative(europe, 1), better: "lower" },
    },
  },
}

// One more country outside Europe, and the frame widens to the world.
export const DerivedWorld: Story = {
  args: {
    spec: {
      title: "Adding one country outside Europe widens the frame",
      fill: {
        kind: "choropleth",
        values: [...illustrative(europe.slice(0, 8), 2), { country: "USA", value: 6.1 }],
      },
    },
  },
}

// Fixed bands keep a shade meaning the same values across years or maps.
export const FixedBreaks: Story = {
  args: {
    spec: {
      title: "Inflation, %",
      source: "Illustrative values",
      fill: {
        kind: "choropleth",
        values: illustrative(europe, 3),
        scale: { kind: "breaks", at: [2, 4, 6, 8] },
      },
    },
  },
}

export const Highlight: Story = {
  args: {
    spec: {
      title: "Founding members of the EEC",
      fill: { kind: "highlight", countries: ["BEL", "FRA", "DEU", "ITA", "LUX", "NLD"] },
    },
  },
}

// A country's own map, with its subdivisions and overseas insets. Only an
// explicit sheet draws it.
export const CountryWithSubdivisions: Story = {
  args: { spec: { sheet: "FRA", fill: { kind: "highlight", countries: ["FRA"] } } },
}

// National sheets credit their publisher, here the ONS under the OGL.
export const StatisticalRegions: Story = {
  args: { spec: { sheet: "GBR", title: "United Kingdom, ITL1 regions" } },
}

// Singapore and Bahrain are too small for the world sheet: the map lists
// them and the table keeps their values.
export const TooSmallToDraw: Story = {
  args: {
    spec: {
      fill: {
        kind: "choropleth",
        values: [
          { country: "SGP", value: 88 },
          { country: "BHR", value: 61 },
          { country: "USA", value: 74 },
          { country: "BRA", value: 55 },
          { country: "IND", value: 31 },
          { country: "CHN", value: 49 },
          { country: "NGA", value: 28 },
          { country: "FRA", value: 70 },
        ],
      },
    },
  },
}

export const Dark: Story = {
  args: { ...Choropleth.args, palette: "dark" },
}

// Country names and numbers follow the locale; the legend's text is English
// for now.
export const French: Story = {
  args: { ...Choropleth.args, locale: "fr" },
}

interface BrowserArgs {
  readonly sheet: SheetId
}

// Every sheet the package ships, one at a time: each is its own chunk.
export const SheetBrowser: StoryObj<BrowserArgs> = {
  args: { sheet: "JPN" },
  argTypes: { sheet: { control: "select", options: sheetIds } },
  loaders: [async ({ args }) => ({ scene: await draw({ sheet: args.sheet }) })],
  render: (_, { loaded }) => figure(loaded["scene"]),
}
