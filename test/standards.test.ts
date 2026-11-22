import { readFileSync } from "node:fs"

import { Catalog, MessageProcessor } from "@a2ui/web_core/v0_9"
import { Ajv2020 } from "ajv/dist/2020.js"
import { describe, expect, it } from "vitest"

import { catalog, id } from "../stories/standards/a2ui.ts"
import { catalog as jsonRender } from "../stories/standards/json-render.tsx"

// A2UI's own v1.0 schemas, as @a2ui/web_core ships them.
const a2ui = (name: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(
      new URL(`../node_modules/@a2ui/web_core/src/v1_0/schemas/${name}`, import.meta.url),
      "utf8",
    ),
  )

// What an agent sends: a surface whose root is a Map.
const surface = (properties: object) => ({
  version: "1.0",
  createSurface: {
    surfaceId: "answer",
    catalogId: id,
    components: [{ id: "root", component: "Map", ...properties }],
  },
})

// A processor that checks messages against the catalog document, as the
// renderer's does; the React components themselves need a DOM.
const processor = () =>
  new MessageProcessor([new Catalog(id, "1.0", [...Catalog.fromJson(catalog).components.values()])])

const highlight = { title: "Members", fill: { kind: "highlight", countries: ["FRA", "DEU"] } }

describe("the A2UI catalog", () => {
  it("is a valid A2UI v1.0 catalog", () => {
    const ajv = new Ajv2020({ strict: false })

    ajv.addSchema(a2ui("common_types.json"))

    const valid = ajv.compile(a2ui("catalog_definition.json"))

    expect(valid(catalog) || valid.errors).toBe(true)
  })

  it("hands a Map the spec an agent sends as its properties", () => {
    const host = processor()
    const errors = host.processMessagesWithErrors([surface(highlight)])
    const [model] = host.model.surfacesMap.values()

    expect(errors).toEqual([])
    expect(model?.componentsModel.get("root")?.properties).toEqual(highlight)
  })

  it("refuses a Map the schema refuses, with an error the agent can read", () => {
    const host = processor()
    const errors = host.processMessagesWithErrors([
      surface({ fill: { kind: "highlight", countries: ["France"] } }),
    ])

    expect(errors).toHaveLength(1)
    expect(JSON.stringify(errors)).toContain("VALIDATION_FAILED")
    expect(JSON.stringify(errors)).toContain("fill.countries.0")
  })
})

// A json-render spec with one Map element.
const page = (props: object) => ({
  root: "map",
  elements: { map: { type: "Map", props, children: [] } },
})

describe("the json-render catalog", () => {
  it("accepts a spec with a Map and refuses one the schema refuses", () => {
    expect(jsonRender.validate(page(highlight)).success).toBe(true)
    expect(
      jsonRender.validate(page({ fill: { kind: "highlight", countries: ["France"] } })).success,
    ).toBe(false)
  })

  it("tells the model the Map's keys and codes", () => {
    const prompt = jsonRender.prompt()
    const line = prompt.slice(
      prompt.indexOf("- Map:"),
      prompt.indexOf("\n", prompt.indexOf("- Map:")),
    )

    expect(line).toContain('kind: "highlight"')
    expect(line).toContain('"FRA"')
  })
})
