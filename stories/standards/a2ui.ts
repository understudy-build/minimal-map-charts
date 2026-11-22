import { schema } from "../../src/index.ts"

// The map as an A2UI v1.0 catalog: one `Map` component whose properties are
// the spec's, and the spec's `$defs` as the catalog's. A2UI catalogs are JSON
// Schema 2020-12 with combinators only in `$defs`, as the spec's schema
// already is, so the translation adds the `component` name, the catalog's
// identity and the unions every catalog declares. Give it to the agent as its catalog and to the
// renderer through `Catalog.fromJson`.
export const id = "https://example.com/catalogs/maps/v1/catalog.json"

export const catalog = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: id,
  catalogId: id,
  protocolVersion: "1.0",
  title: "Maps",
  description: "A map of countries, drawn from a spec.",
  instructions:
    "To show where countries are, or a number per country, use a Map. Give `fill` and leave out `sheet`.",
  components: {
    Map: {
      type: "object",
      description: schema.description,
      properties: { component: { const: "Map" }, ...schema.properties },
      required: ["component"],
    },
  },
  functions: {},
  $defs: {
    ...schema.$defs,
    // Every v1.0 catalog names its components and functions in two unions;
    // with no functions, that union admits nothing.
    anyComponent: {
      oneOf: [{ $ref: "#/components/Map" }],
      discriminator: { propertyName: "component" },
    },
    anyFunction: { not: {} },
  },
} as const
