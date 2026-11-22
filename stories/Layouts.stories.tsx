import type { Meta, StoryObj } from "@storybook/html-vite"
import type { ReactElement } from "react"

import { type Country as Code, draw, type Layout } from "../src/index.ts"
import { figure, illustrative } from "./figure.ts"
import { Country, Panel, Region, Sheet, layout } from "./sheet.tsx"

interface LayoutArgs {
  readonly sheet: Layout
}

const compared: ReadonlyArray<Code> = [
  "USA",
  "GBR",
  "FRA",
  "ESP",
  "BEL",
  "NLD",
  "LUX",
  "DEU",
  "ITA",
]

// Each story writes its layout in JSX, draws it, and prints the layout as the
// JSON a model would send in `sheet`.
const meta = {
  title: "Maps/Layouts",
  argTypes: { sheet: { control: "object" } },
  loaders: [
    async ({ args }) => ({
      scene: await draw({
        sheet: args.sheet,
        title: "GDP growth, 2024 (%)",
        source: "Illustrative values",
        fill: { kind: "choropleth", values: illustrative(compared, 3), better: "higher" },
      }),
    }),
  ],
  render: (args, { loaded }) => {
    const root = document.createElement("div")
    const json = document.createElement("pre")

    json.style.cssText = "font:12px ui-monospace,monospace;max-width:900px;white-space:pre-wrap"
    json.textContent = JSON.stringify({ sheet: args.sheet }, null, 2)
    root.append(figure(loaded["scene"]), json)

    return root
  },
} satisfies Meta<LayoutArgs>

export default meta

type Story = StoryObj<LayoutArgs>

const story = (sheet: ReactElement<Parameters<typeof Sheet>[0]>): Story => ({
  args: { sheet: layout(sheet) },
})

// The United States and Western Europe are an ocean apart, so they split
// into two panels at one scale: a kilometre is as long in both.
export const Comparison = story(
  <Sheet>
    <Country code="USA" />
    <Country code="GBR" />
    <Country code="FRA" />
    <Country code="ESP" />
    <Country code="BEL" />
    <Country code="NLD" />
    <Country code="LUX" />
    <Country code="DEU" />
    <Country code="ITA" />
  </Sheet>,
)

// No places: the countries in the fill frame the map.
export const FromFill = story(<Sheet />)

// One panel holds every place, ocean and all: a crop of the world sheet.
export const OneFrame = story(
  <Sheet>
    <Panel>
      <Country code="USA" />
      <Country code="FRA" />
      <Country code="GBR" />
    </Panel>
  </Sheet>,
)

// Every panel as tall as the others: easier to read, but Europe looks as big
// as the United States.
export const Fit = story(
  <Sheet scale="fit">
    <Country code="USA" />
    <Region id="europe" />
  </Sheet>,
)

// Mainland France and Portugal only: no boxes for their far parts.
export const NoInsets = story(
  <Sheet>
    <Country code="FRA" insets={false} />
    <Country code="ESP" />
    <Country code="PRT" insets={false} />
  </Sheet>,
)

// Only the countries named: no grey neighbours.
export const NoContext = story(
  <Sheet context={false}>
    <Country code="USA" />
    <Country code="FRA" />
    <Country code="DEU" />
  </Sheet>,
)

export const World = story(
  <Sheet>
    <Region id="world" />
  </Sheet>,
)
