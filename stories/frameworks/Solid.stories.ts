import type { Meta, StoryObj } from "@storybook/html-vite"

import type { Spec } from "../../src/index.ts"
import { growth, output } from "./examples.ts"
import { FromModel, Ranked, Whole } from "./solid/examples.tsx"
import { mount } from "./solid/mount.tsx"

// The scene drawn with Solid: `useDrawn` is a resource read under Suspense,
// and the `Figure` parts render it. stories/frameworks/solid/figure.tsx is
// the whole recipe.
const meta = {
  title: "Frameworks/Solid",
  parameters: {
    docs: { description: { component: "Maps rendered with Solid from the same scene." } },
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
  render: () => mount(Ranked, {}),
}

export const ModelOutput: StoryObj<{ readonly input: unknown }> = {
  args: { input: output },
  argTypes: { input: { control: "object" } },
  render: ({ input }) => mount(FromModel, { input }),
}
