import type { Meta, StoryObj } from "@storybook/html-vite"

import { draw, regions, type Spec } from "../src/index.ts"
import { figure, illustrative, palettes } from "./figure.ts"

interface ColourArgs {
  readonly spec: Spec
  readonly palette: keyof typeof palettes
}

// The spec picks colours; the palette sets their lightness. Switch between
// light and dark: each colour keeps its hue, and the lowest values always sit
// nearest the surface.
const meta = {
  title: "Maps/Colour scales",
  args: { palette: "light" },
  argTypes: { palette: { control: "inline-radio", options: Object.keys(palettes) } },
  loaders: [async ({ args }) => ({ scene: await draw(args.spec) })],
  render: (args, { loaded }) => figure(loaded["scene"], { palette: palettes[args.palette] }),
} satisfies Meta<ColourArgs>

export default meta

type Story = StoryObj<ColourArgs>

const europe = regions.find((region) => region.id === "europe")?.countries ?? []

// One colour for the whole ramp, palest for the lowest class.
export const Sequential: Story = {
  args: {
    spec: {
      title: "Forest cover, % of land",
      source: "Illustrative values",
      fill: {
        kind: "choropleth",
        values: illustrative(europe, 2),
        scale: { kind: "quantile", classes: 5, colour: "#2e7d32" },
        better: "higher",
      },
    },
  },
}

// Values either side of zero: red for losses, blue for gains, and a neutral
// band holding zero. Each band is stronger the further it sits from zero.
const change = Object.fromEntries(
  Object.entries(illustrative(europe, 4)).map(([code, value]) => [
    code,
    Math.round((value - 7) * 10) / 10,
  ]),
)

export const Diverging: Story = {
  args: {
    spec: {
      title: "Population change since 2015, %",
      source: "Illustrative values",
      fill: {
        kind: "choropleth",
        values: change,
        scale: {
          kind: "diverging",
          at: [-3, -1, 1, 3],
          mid: 0,
          below: "#c62828",
          above: "#1565c0",
        },
      },
    },
  },
}

// With `mid` on a break there is no neutral band: every country is a loss
// or a gain.
export const DivergingOnABreak: Story = {
  args: {
    spec: {
      ...Diverging.args?.spec,
      fill: {
        kind: "choropleth",
        values: change,
        scale: {
          kind: "diverging",
          at: [-2, 0, 2],
          mid: 0,
          below: "#c62828",
          above: "#1565c0",
        },
      },
    },
  },
}

export const DarkDiverging: Story = { args: { ...Diverging.args, palette: "dark" } }

// A highlight in a colour of the spec's choosing.
export const Highlight: Story = {
  args: {
    spec: {
      title: "Founding members of the EEC, 1957",
      fill: {
        kind: "highlight",
        countries: ["BEL", "FRA", "DEU", "ITA", "LUX", "NLD"],
        colour: "#ef6c00",
      },
    },
  },
}
