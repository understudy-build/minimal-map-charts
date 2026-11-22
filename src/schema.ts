import { countries } from "./countries.ts"
import { regions } from "./regions.ts"
import { nations } from "./sheet.ts"

// The spec as JSON Schema, for model tool definitions, structured output and
// UI catalogs. It reads the same in draft-07 and 2020-12, and keeps to the
// keywords strict structured output accepts: `anyOf` rather than `oneOf`, no
// `not`, and closed objects throughout. Combinators sit in `$defs`, never at
// the root, as A2UI catalogs require. It guides; `parse` decides. Rules the
// schema leaves out, ascending breaks, countries listed once and countries on
// an explicit sheet, are written into the descriptions and enforced by
// `parse`.
export const schema = {
  title: "Map",
  description:
    "A map of countries. Give `fill` and leave out `sheet`: the map then frames the narrowest region holding every country in the fill, else the world.",
  type: "object",
  additionalProperties: false,
  properties: {
    sheet: { $ref: "#/$defs/sheet" },
    title: { description: "A short title.", type: "string" },
    source: {
      description: 'Who published the values, e.g. "World Bank". Shown with the map.',
      type: "string",
    },
    fill: { $ref: "#/$defs/fill" },
  },
  $defs: {
    sheet: {
      description:
        "Which map to draw. Leave it out unless asked for a specific map or layout. A name picks a prebuilt map; an object lays countries out in panels cropped from the prebuilt maps.",
      anyOf: [
        {
          description:
            '"world", a region id, or the ISO 3166-1 alpha-3 code of a country to draw its own map with its subdivisions. Every country in `fill` must be on this sheet.',
          enum: ["world", ...regions.map((region) => region.id), ...nations],
        },
        { $ref: "#/$defs/layout" },
      ],
    },
    layout: {
      description:
        "A layout. With `places`, countries far apart split into panels side by side, e.g. the United States beside Western Europe. With `panels`, each panel is drawn as given; give one or the other, not both. Without either, the places are the countries in `fill`.",
      type: "object",
      additionalProperties: false,
      properties: {
        scale: {
          description:
            '"shared" (default): a kilometre is as long in every panel, so areas compare. "fit": every panel equally tall.',
          enum: ["shared", "fit"],
        },
        insets: { $ref: "#/$defs/insets" },
        context: {
          description:
            "Draw the land and countries around the panels' countries in grey. Defaults to true.",
          type: "boolean",
        },
        places: { $ref: "#/$defs/places" },
        panels: {
          description: "Panels drawn left to right. Use instead of `places`, not with it.",
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["places"],
            properties: { places: { $ref: "#/$defs/places" } },
          },
        },
      },
    },
    fill: {
      description: "How to colour countries.",
      anyOf: [{ $ref: "#/$defs/choropleth" }, { $ref: "#/$defs/highlight" }],
    },
    choropleth: {
      description: "Countries shaded by a number each.",
      type: "object",
      additionalProperties: false,
      required: ["kind", "values"],
      properties: {
        kind: { const: "choropleth" },
        values: { $ref: "#/$defs/values" },
        scale: { $ref: "#/$defs/scale" },
        better: {
          description: "Which way is better, if either. Shown in the legend.",
          enum: ["higher", "lower"],
        },
      },
    },
    highlight: {
      description: "Countries picked out in one colour.",
      type: "object",
      additionalProperties: false,
      required: ["kind", "countries"],
      properties: {
        kind: { const: "highlight" },
        countries: {
          description: "The countries to pick out, as ISO 3166-1 alpha-3 codes, each listed once.",
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/country" },
        },
        colour: { $ref: "#/$defs/colour" },
      },
    },
    values: {
      description:
        "One number per country, each country listed once. Countries left out show as no data.",
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["country", "value"],
        properties: {
          country: { $ref: "#/$defs/country" },
          value: { type: "number" },
        },
      },
    },
    scale: {
      description:
        "How values become shades. Defaults to 5 quantile classes in the renderer's colour.",
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["kind"],
          properties: {
            kind: { const: "quantile" },
            classes: { enum: [3, 4, 5, 6, 7] },
            colour: { $ref: "#/$defs/colour" },
          },
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["kind", "at"],
          properties: {
            kind: { const: "breaks" },
            at: { $ref: "#/$defs/breaks" },
            colour: { $ref: "#/$defs/colour" },
          },
        },
        {
          description:
            "For values either side of a meaningful middle, such as losses and gains around 0. Bands below `mid` take `below`, bands above it take `above`, each stronger the further from `mid`. A band holding `mid` is neutral; with `mid` on a break, none is. The two hues must be at least 60° apart, e.g. red and blue.",
          type: "object",
          additionalProperties: false,
          required: ["kind", "at", "mid", "below", "above"],
          properties: {
            kind: { const: "diverging" },
            at: { $ref: "#/$defs/breaks" },
            mid: {
              description: "The middle value, from the first break to the last.",
              type: "number",
            },
            below: { $ref: "#/$defs/colour" },
            above: { $ref: "#/$defs/colour" },
          },
        },
      ],
    },
    insets: {
      description:
        "Draw a country's far parts, such as the Canaries or Hawaii, in their own boxes beside the map. Defaults to true.",
      type: "boolean",
    },
    places: {
      description:
        'Country codes, region ids, "world" for every country, or a country with its own `insets` rule.',
      type: "array",
      minItems: 1,
      items: {
        anyOf: [
          { $ref: "#/$defs/country" },
          {
            description: "A region's countries, or every country.",
            enum: ["world", ...regions.map((region) => region.id)],
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["country"],
            properties: {
              country: { $ref: "#/$defs/country" },
              insets: { $ref: "#/$defs/insets" },
            },
          },
        ],
      },
    },
    breaks: {
      description:
        "Band boundaries in strictly ascending order. A value at a break falls in the band above it.",
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "number" },
    },
    colour: {
      description:
        'A colour as "#rrggbb", chosen for what the values mean, e.g. green for forests or red for losses. Only its hue and saturation are kept: the renderer sets each shade\'s lightness for a light or dark page. Not a grey.',
      type: "string",
      pattern: "^#[0-9a-fA-F]{6}$",
    },
    country: {
      description: "An ISO 3166-1 alpha-3 code; XKX for Kosovo, CHI for the Channel Islands.",
      enum: countries.map((country) => country.code),
    },
  },
} as const

type Node = Readonly<Record<string, unknown>>

const isNode = (input: unknown): input is Node =>
  typeof input === "object" && input !== null && !Array.isArray(input)

const walk = (input: unknown): unknown =>
  Array.isArray(input) ? input.map(walk) : isNode(input) ? strictly(input) : input

// Every key required, and each one the schema left optional also takes null.
const strictly = (node: Node): Node => {
  const walked = Object.fromEntries(
    Object.entries(node).map(([key, each]) => [key, key === "properties" ? each : walk(each)]),
  )
  const properties = node["properties"]

  if (!isNode(properties)) return walked

  const given = new Set(Array.isArray(node["required"]) ? node["required"] : [])

  return {
    ...walked,
    required: Object.keys(properties),
    properties: Object.fromEntries(
      Object.entries(properties).map(([key, each]) => [
        key,
        given.has(key) ? walk(each) : { anyOf: [walk(each), { type: "null" }] },
      ]),
    ),
  }
}

// The spec for structured output that requires every key, such as OpenAI's
// strict mode: a key with no value is written as null, which `parse` reads as
// left out.
export const strict = /* @__PURE__ */ strictly(schema)
