import type { Meta, StoryObj } from "@storybook/html-vite"

import type { Spec } from "../../src/index.ts"
import { growth, output } from "./examples.ts"
import FromModel from "./vue/FromModel.vue"
import { mount } from "./vue/mount.ts"
import Ranked from "./vue/Ranked.vue"
import Whole from "./vue/Whole.vue"

// The scene drawn with Vue: `useScene` redraws when the spec changes, and
// the `Figure` single-file components render it. stories/frameworks/vue/ is
// the whole recipe.
const meta = {
  title: "Frameworks/Vue",
  parameters: {
    docs: { description: { component: "Maps rendered with Vue 3 from the same scene." } },
  },
} satisfies Meta

export default meta

// Every part in its usual order. Edit the spec in the controls.
export const Basic: StoryObj<{ readonly spec: Spec }> = {
  args: { spec: growth },
  argTypes: { spec: { control: "object" } },
  render: ({ spec }) => mount(Whole, { spec }),
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
