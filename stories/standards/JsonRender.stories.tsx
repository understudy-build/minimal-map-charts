import { JSONUIProvider, Renderer } from "@json-render/react"
import type { Meta, StoryObj } from "@storybook/html-vite"

import { growth } from "../frameworks/examples.ts"
import { mount } from "../frameworks/react/mount.tsx"
import { catalog, registry } from "./json-render.tsx"

// The map as a component in a json-render catalog. stories/standards/
// json-render.tsx is the whole recipe.
const meta = {
  title: "Standards/json-render",
  parameters: {
    docs: { description: { component: "A json-render spec with a Map element, drawn in React." } },
  },
} satisfies Meta

export default meta

// A json-render spec: a flat map of elements, here one Map whose props are
// the map's spec.
const page = (props: Record<string, unknown>) => ({
  root: "map",
  elements: { map: { type: "Map", props, children: [] } },
})

type Story = StoryObj<{ readonly props: Record<string, unknown> }>

const render: Story["render"] = ({ props }) =>
  mount(
    <JSONUIProvider registry={registry}>
      <Renderer spec={page(props)} registry={registry} />
    </JSONUIProvider>,
  )

export const Rendered: Story = {
  args: { props: { ...growth } },
  argTypes: { props: { control: "object" } },
  render,
}

// A country's areas, named by ISO 3166-2 code: the same component draws
// them on the country's own map.
export const Areas: Story = {
  args: {
    props: {
      title: "Seven western states",
      source: "Illustrative values",
      fill: {
        kind: "choropleth",
        values: [
          { area: "US-AK", value: 10 },
          { area: "US-AZ", value: 17 },
          { area: "US-CA", value: 11 },
          { area: "US-CO", value: 18 },
          { area: "US-HI", value: 12 },
          { area: "US-ID", value: 19 },
          { area: "US-MT", value: 13 },
        ],
      },
    },
  },
  argTypes: { props: { control: "object" } },
  render,
}

// Props a model got wrong. The renderer draws what it is given, so the Map
// element shows the lines `parse` returns; a host runs `catalog.validate` on
// the spec first and sends the model what it refuses.
export const Mistakes: Story = {
  args: {
    props: {
      fill: {
        kind: "choropleth",
        values: [
          { country: "France", value: 1.2 },
          { country: "DEU", value: 0.3 },
        ],
      },
    },
  },
  argTypes: { props: { control: "object" } },
  render,
}

// What the model reads about the Map: the line json-render writes into its
// system prompt, from the spec's JSON Schema.
export const Prompt: StoryObj = {
  render: () => {
    const block = document.createElement("pre")
    const prompt = catalog.prompt()
    const start = prompt.indexOf("- Map:")

    block.style.cssText = "font-size:12px;white-space:pre-wrap;max-width:900px"
    block.textContent = prompt.slice(start, prompt.indexOf("\n", start))

    return block
  },
}
