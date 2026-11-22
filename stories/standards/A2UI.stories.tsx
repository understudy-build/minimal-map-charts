import { A2uiSurface } from "@a2ui/react"
import { MessageProcessor } from "@a2ui/web_core/v0_9"
import type { Meta, StoryObj } from "@storybook/html-vite"
import type { ComponentProps } from "react"

import { growth } from "../frameworks/examples.ts"
import { mount } from "../frameworks/react/mount.tsx"
import { catalog, id } from "./a2ui.ts"
import { renderer } from "./a2ui.tsx"

// The map as a component in an A2UI catalog. stories/standards/a2ui.ts is the
// agent's half, the catalog; stories/standards/a2ui.tsx the renderer's.
const meta = {
  title: "Standards/A2UI",
  parameters: {
    docs: {
      description: { component: "An A2UI v1.0 surface with a Map component, drawn in React." },
    },
  },
} satisfies Meta

export default meta

// The message an agent sends: a surface whose root is a Map.
const message = (properties: object) => ({
  version: "1.0",
  createSurface: {
    surfaceId: "answer",
    catalogId: id,
    components: [{ id: "root", component: "Map", ...properties }],
  },
})

export const Rendered: StoryObj = {
  render: () => {
    const processor = new MessageProcessor([renderer])
    // The agent's messages are untrusted JSON: the processor parses them and
    // returns what it refused, as A2UI error messages for the agent.
    const errors = processor.processMessagesWithErrors([message(growth)])
    const [surface] = processor.model.surfacesMap.values()

    return mount(
      surface === undefined ? (
        <pre>{JSON.stringify(errors, null, 2)}</pre>
      ) : (
        // The same zod 3 and zod 4 split as in a2ui.tsx.
        <A2uiSurface
          surface={surface as unknown as ComponentProps<typeof A2uiSurface>["surface"]}
        />
      ),
    )
  },
}

// The catalog an agent is given, with the list of country codes cut short.
export const Catalog: StoryObj = {
  render: () => {
    const block = document.createElement("pre")

    block.style.cssText = "font-size:12px;max-height:80vh;overflow:auto"
    block.textContent = JSON.stringify(
      {
        ...catalog,
        $defs: { ...catalog.$defs, country: { ...catalog.$defs.country, enum: ["…"] } },
      },
      null,
      2,
    )

    return block
  },
}
