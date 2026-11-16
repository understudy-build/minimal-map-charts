import type { Meta, StoryObj } from "@storybook/html-vite"

import { draw, light, type Palette, regions, type Spec } from "../src/index.ts"
import { figure, illustrative } from "./figure.ts"

interface ColourArgs {
  readonly spec: Spec
  // Edit `shades` in the controls to try another ramp.
  readonly palette: Palette
}

// A colour scale is a palette: the renderer maps each class to one of its
// `shades`, lowest values first. The spec stays the same; only the renderer
// changes, so a model never picks colours.
const meta = {
  title: "Maps/Colour scales",
  argTypes: { palette: { control: "object" } },
  loaders: [async ({ args }) => ({ scene: await draw(args.spec) })],
  render: (args, { loaded }) => figure(loaded["scene"], { palette: args.palette }),
} satisfies Meta<ColourArgs>

export default meta

type Story = StoryObj<ColourArgs>

const europe = regions.find((region) => region.id === "europe")?.countries ?? []

// A sequential ramp of your own, such as a brand's greens. Give it as many
// shades as you like: a legend with fewer classes samples it evenly, from
// the lightest shade to the darkest.
export const Sequential: Story = {
  args: {
    spec: {
      title: "Organic farmland, % of farmland",
      source: "Illustrative values",
      fill: {
        kind: "choropleth",
        values: illustrative(europe, 2),
        scale: { kind: "quantile", classes: 5 },
        better: "higher",
      },
    },
    palette: {
      ...light,
      shades: ["#edf8e9", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a32"],
      accent: "#238b45",
    },
  },
}

// Values either side of zero read best on a diverging scale: one hue for
// losses, another for gains, and a neutral class around zero. Fixed breaks
// that mirror each other around zero give five classes, and the palette
// gives exactly five shades, so each class takes its own shade. The middle
// one is pale yellow rather than white or grey, so countries near zero do
// not read as land or as no data.
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
        scale: { kind: "breaks", at: [-3, -1, 1, 3] },
      },
    },
    palette: {
      ...light,
      shades: ["#d7191c", "#fdae61", "#ffffbf", "#abd9e9", "#2c7bb6"],
    },
  },
}
