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
        'Which map to draw. Leave it out unless asked for a specific map. "world", a region id, or the ISO 3166-1 alpha-3 code of a country to draw its own map with its subdivisions. Every country in `fill` must be on this sheet.',
      enum: ["world", ...regions.map((region) => region.id), ...nations],
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
    country: {
      description: "An ISO 3166-1 alpha-3 code; XKX for Kosovo, CHI for the Channel Islands.",
      enum: countries.map((country) => country.code),
    },
  },
} as const
