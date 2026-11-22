import type { Meta, StoryObj } from "@storybook/html-vite"

import { regions, sheetIds, type SheetId, type Spec } from "../src/index.ts"
import { drawn, figure, illustrative, palettes } from "./figure.ts"

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
  loaders: [async ({ args }) => ({ scene: await drawn(args.spec, { locale: args.locale }) })],
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

// A country's areas by ISO 3166-2 code: US codes draw the United States
// sheet, Alaska and Hawaii included, and states without a value show as no
// data.
export const AreaChoropleth: Story = {
  args: {
    spec: {
      title: "Seven western states",
      source: "Illustrative values",
      fill: {
        kind: "choropleth",
        values: (["US-AK", "US-AZ", "US-CA", "US-CO", "US-HI", "US-ID", "US-MT"] as const).map(
          (area, index) => ({ area, value: 10 + ((index * 7) % 13) }),
        ),
        scale: { kind: "quantile", classes: 3 },
      },
    },
  },
}

// Areas picked out in one colour.
export const AreaHighlight: Story = {
  args: {
    spec: {
      title: "Regions on the Atlantic",
      fill: {
        kind: "highlight",
        areas: ["FR-BRE", "FR-NAQ", "FR-NOR", "FR-PDL"],
        colour: "#00838f",
      },
    },
  },
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

// Offices named by their city, and one Natural Earth does not list at its
// coordinates, as circles whose area is the office's staff.
export const Offices: Story = {
  args: {
    spec: {
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
          { place: "Lyon", country: "FRA", value: 40 },
          { name: "Sophia Antipolis", lat: 43.62, lon: 7.05, value: 25 },
        ],
      },
    },
  },
}

// Dots on a country's map: Honolulu and Anchorage in their insets,
// Washington on the map and in the zoom on the District of Columbia, and
// one of five Springfields told apart by its state.
export const FieldSites: Story = {
  args: {
    spec: {
      sheet: "USA",
      title: "Field sites",
      points: {
        kind: "dot",
        label: "Field sites",
        sites: [
          { place: "Honolulu", country: "USA" },
          { place: "Anchorage", country: "USA" },
          { place: "Washington", country: "USA" },
          { place: "Chicago", country: "USA" },
          { place: "Springfield", country: "USA", area: "US-IL" },
          { name: "Austin office", lat: 30.27, lon: -97.74 },
        ],
      },
    },
  },
}

// Points over a choropleth of a country's areas.
export const PointsOnAreas: Story = {
  args: {
    spec: {
      title: "Unemployment by region, with our sites",
      source: "Illustrative values",
      fill: {
        kind: "choropleth",
        values: [
          { area: "FR-HDF", value: 10.1 },
          { area: "FR-OCC", value: 9.6 },
          { area: "FR-PAC", value: 8.9 },
          { area: "FR-IDF", value: 7.1 },
          { area: "FR-ARA", value: 6.2 },
          { area: "FR-BRE", value: 5.8 },
          { area: "FR-PDL", value: 5.9 },
          { area: "FR-NAQ", value: 7.0 },
        ],
        better: "lower",
      },
      points: {
        kind: "dot",
        label: "Sites",
        sites: [
          { place: "Lille", country: "FRA" },
          { place: "Toulouse", country: "FRA" },
          { place: "Rennes", country: "FRA" },
          { place: "Saint-Denis", country: "FRA", name: "Saint-Denis, Réunion" },
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
  loaders: [async ({ args }) => ({ scene: await drawn({ sheet: args.sheet }) })],
  render: (_, { loaded }) => figure(loaded["scene"]),
}
