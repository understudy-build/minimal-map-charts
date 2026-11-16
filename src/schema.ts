import { countries } from "./countries.ts"
import { regions } from "./regions.ts"
import { nations } from "./sheet.ts"

// The spec as JSON Schema (draft-07), for model tool definitions and
// structured output. It guides; `parse` decides. Rules JSON Schema cannot
// state, ascending breaks and countries on an explicit sheet, are written into
// the descriptions and enforced by `parse`.
export const schema = {
  title: "Map",
  description:
    "A map of countries. Give `fill` and leave out `sheet`: the map then frames the narrowest region holding every country in the fill, else the world.",
  type: "object",
  additionalProperties: false,
  properties: {
    sheet: {
      description:
        "Which map to draw. Leave it out unless asked for a specific map or layout. A name picks a prebuilt map; an object lays countries out in panels cropped from the prebuilt maps.",
      oneOf: [
        {
          description:
            '"world", a region id, or the ISO 3166-1 alpha-3 code of a country to draw its own map with its subdivisions. Every country in `fill` must be on this sheet.',
          enum: ["world", ...regions.map((region) => region.id), ...nations],
        },
        {
          description:
            "A layout. With `places`, countries far apart split into panels side by side, e.g. the United States beside Western Europe. With `panels`, each panel is drawn as given. Without either, the places are the countries in `fill`.",
          type: "object",
          additionalProperties: false,
          not: { required: ["places", "panels"] },
          properties: {
            scale: {
              description:
                '"shared" (default): a kilometre is as long in every panel, so areas compare. "fit": every panel equally tall.',
              enum: ["shared", "fit"],
            },
            insets: { $ref: "#/definitions/insets" },
            context: {
              description:
                "Draw the land and countries around the panels' countries in grey. Defaults to true.",
              type: "boolean",
            },
            places: { $ref: "#/definitions/places" },
            panels: {
              description: "Panels drawn left to right. Use instead of `places`, not with it.",
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["places"],
                properties: { places: { $ref: "#/definitions/places" } },
              },
            },
          },
        },
      ],
    },
    title: { description: "A short title.", type: "string", minLength: 1 },
    source: {
      description: 'Who published the values, e.g. "World Bank". Shown with the map.',
      type: "string",
      minLength: 1,
    },
    fill: {
      description: "How to colour countries.",
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["kind", "values"],
          properties: {
            kind: { const: "choropleth" },
            values: {
              description:
                "One number per country, keyed by ISO 3166-1 alpha-3 code. Countries left out show as no data.",
              type: "object",
              propertyNames: { $ref: "#/definitions/country" },
              additionalProperties: { type: "number" },
            },
            scale: {
              description: "How values become shades. Defaults to 5 quantile classes.",
              oneOf: [
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind"],
                  properties: {
                    kind: { const: "quantile" },
                    classes: { enum: [3, 4, 5, 6, 7] },
                  },
                },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind", "at"],
                  properties: {
                    kind: { const: "breaks" },
                    at: {
                      description:
                        "Band boundaries in strictly ascending order. A value at a break falls in the band above it.",
                      type: "array",
                      minItems: 1,
                      maxItems: 6,
                      items: { type: "number" },
                    },
                  },
                },
              ],
            },
            better: {
              description: "Which way is better, if either. Shown in the legend.",
              enum: ["higher", "lower"],
            },
          },
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["kind", "countries"],
          properties: {
            kind: { const: "highlight" },
            countries: {
              description: "The countries to pick out, as ISO 3166-1 alpha-3 codes.",
              type: "array",
              minItems: 1,
              uniqueItems: true,
              items: { $ref: "#/definitions/country" },
            },
          },
        },
      ],
    },
  },
  definitions: {
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
        oneOf: [
          { $ref: "#/definitions/country" },
          {
            description: "A region's countries, or every country.",
            enum: ["world", ...regions.map((region) => region.id)],
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["country"],
            properties: {
              country: { $ref: "#/definitions/country" },
              insets: { $ref: "#/definitions/insets" },
            },
          },
        ],
      },
    },
    country: {
      description: "An ISO 3166-1 alpha-3 code; XKX for Kosovo, CHI for the Channel Islands.",
      enum: countries.map((country) => country.code),
    },
  },
} as const
