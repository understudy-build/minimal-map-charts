import type { Meta, StoryObj } from "@storybook/html-vite"

import type { Spec } from "../../src/index.ts"
import { growth, offices, output } from "./examples.ts"
import FromModel from "./svelte/FromModel.svelte"
import { mount } from "./svelte/mount.ts"
import Ranked from "./svelte/Ranked.svelte"
import Whole from "./svelte/Whole.svelte"

// The scene drawn with Svelte 5: {#await} draws it, and the `Figure`
// components render it. stories/frameworks/svelte/ is the whole recipe.
const meta = {
  title: "Frameworks/Svelte",
  parameters: {
    docs: { description: { component: "Maps rendered with Svelte 5 from the same scene." } },
  },
} satisfies Meta

export default meta

// Every part in its usual order. Edit the spec in the controls.
export const Basic: StoryObj<{ readonly spec: Spec }> = {
  args: { spec: growth },
  argTypes: { spec: { control: "object" } },
  render: ({ spec }) => mount(Whole, { spec }),
}

// Offices sized by staff: the map and the inset hold the points, the legend
// their sizes, the table one row per site.
export const Points: StoryObj = {
  render: () => mount(Whole, { spec: offices }),
}

// A ranking of your own that shares the active country with the map.
export const Linked: StoryObj = {
  render: () => mount(Ranked),
}

export const ModelOutput: StoryObj<{ readonly input: unknown }> = {
  args: { input: output },
  argTypes: { input: { control: "object" } },
  render: ({ input }) => mount(FromModel, { input }),
}
