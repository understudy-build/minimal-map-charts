import { createBinderlessComponentImplementation } from "@a2ui/react"
import { Catalog, type ComponentApi } from "@a2ui/web_core/v0_9"

import { catalog, id } from "./a2ui.ts"
import { Map } from "./map.tsx"

// The renderer's half of the A2UI recipe: the catalog document becomes the
// component's API, so the renderer checks a message against the same schema
// the agent was given, and the component draws the properties it receives.
const [api] = Catalog.fromJson(catalog).components.values()

if (api === undefined) throw new Error("The maps catalog has no Map component.")

const map = createBinderlessComponentImplementation(api, ({ context }) => (
  <Map input={context.componentModel.properties} />
))

// In this repository @a2ui/react resolves zod 4, which json-render needs,
// while @a2ui/web_core keeps zod 3, so their component types differ though
// the objects match. An app with only A2UI installed needs no cast.
export const renderer = new Catalog(id, "1.0", [map as unknown as ComponentApi])
