import { defineCatalog } from "@json-render/core"
import { defineRegistry } from "@json-render/react"
import { schema as react } from "@json-render/react/schema"
import { type core, z } from "zod"

import { schema } from "../../src/index.ts"
import { Map } from "./map.tsx"

// The map as a json-render component: copy it into an app. json-render takes
// props as Zod, and Zod reads the spec's JSON Schema as it is, so the
// catalog's prompt lists every key and code, and `catalog.validate` refuses
// what the schema refuses. The component still runs `parse`, which holds the
// rules a schema cannot state.
export const catalog = defineCatalog(react, {
  components: {
    // The schema is a readonly literal, and Zod types its input with mutable
    // arrays; the value is the same.
    Map: {
      props: z.fromJSONSchema(schema as unknown as core.JSONSchema.JSONSchema),
      description: schema.description,
    },
  },
  actions: {},
})

export const { registry } = defineRegistry(catalog, {
  components: { Map: ({ props }) => <Map input={props} /> },
})
