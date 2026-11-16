# @nicolastoulemont/minimal-map-charts

Minimal map charts for generative UI.

It is a chart, not a mapping library. There are no tiles, no pan and zoom across the globe, and no geographies beyond countries and their subdivisions. For those, use MapLibre. For other chart types, use Vega-Lite, Observable Plot or D3.

## How it works

### Generate map charts from a JSON object

Give a model the spec's JSON Schema as a tool. Whatever it sends goes is parsed then drawn.

```ts
import { describe, draw, parse, schema, svg } from "@nicolastoulemont/minimal-map-charts"

const tool = { name: "show_map", description: "Draw a map of countries", input_schema: schema }

const call = async (input: unknown) => {
  const parsed = parse(input)

  return parsed.ok
    ? { svg: svg(await draw(parsed.spec)) }
    : { error: parsed.issues.map(describe).join("\n") }
}
```

For example, if the user asked which countries use the euro, the model only needs to send the following JSON payload to render the chart:

<!-- prettier-ignore -->
```json
{
  "title": "Euro area members, 2026",
  "fill": {
    "kind": "highlight",
    "countries": ["AUT", "BEL", "BGR", "HRV", "CYP", "EST", "FIN", "FRA", "DEU", "GRC", "IRL",
                  "ITA", "LVA", "LTU", "LUX", "MLT", "NLD", "PRT", "SVK", "SVN", "ESP"]
  }
}
```

![Euro area members on the Europe map, with insets for French overseas regions, the Canaries, the Azores and Madeira](docs/images/euro.svg)

A few things:

1. The container map is inferred when possible, for this chart every country is in Europe, so `draw` picks the Europe sheet.
2. Islands get insets: France's overseas regions and Portugal's and Spain's islands get insets.
3. Validation: Had the model written `"France"`, it would get back `fill.countries.0: "France" is not a country code. Did you mean "FRA"?`.
4. The page pays 24.9 kB gzipped for this: the code with `parse` and `schema`, plus the Europe sheet.

### Compare countries far apart at the same scale

For example, to compare GDP growth in the United States and Western Europe, list the countries in a layout. There is no projection to pick:

```json
{
  "sheet": { "places": ["USA", "GBR", "FRA", "ESP", "BEL", "NLD", "DEU", "ITA"], "insets": false },
  "title": "GDP growth, 2024 (%)",
  "source": "Illustrative values",
  "fill": {
    "kind": "choropleth",
    "values": {
      "USA": 2.8,
      "GBR": 1.1,
      "FRA": 1.1,
      "ESP": 3.2,
      "BEL": 1,
      "NLD": 0.9,
      "DEU": -0.2,
      "ITA": 0.7
    },
    "better": "higher"
  }
}
```

![The United States beside Western Europe, both at the same scale](docs/images/comparison.svg)

A few things:

1. Panels: countries more than 2,000 km apart are split into panels side by side.
2. Same scale: a kilometre is as long in both panels, so the countries compare by size as well as by colour. `"scale": "fit"` makes the panels equally tall instead.
3. No projection in the browser: each panel is cropped from the narrowest prebuilt sheet that holds its countries, here North America and Europe.
4. The page pays about 45 kB gzipped for this: the code, the layout code and both sheets.

## Quick start

```ts
import { draw, parse, svg } from "@nicolastoulemont/minimal-map-charts"

const parsed = parse({
  title: "GDP growth, 2024 (%)",
  source: "World Bank",
  fill: { kind: "choropleth", values: { FRA: 1.1, DEU: -0.2, ESP: 3.2 }, better: "higher" },
})

if (parsed.ok) document.body.innerHTML = svg(await draw(parsed.spec))
```

A few things:

1. The map is inferred: every country in the fill is in Europe, so it draws Europe. Add the United States and it draws the world.
2. `sheet` overrides it: `"sheet": "FRA"` draws France with its regions and overseas insets. `scene.choice` is `"Given"` or `"Derived"`.

## Use it with a model

The spec describes what to show, not how to draw it: countries and values, never projections, joins or colours. The shortest valid spec is a correct map, so a model has few ways to get it wrong.

1. Tool schema: `schema` is the spec as JSON Schema, for a tool's input or for structured output.
2. Validation: `parse` returns typed issues, and `describe` turns each into a line the model can fix on its next turn:

   ```
   fill.values.France: "France" is not a country code. Did you mean "FRA"?
   fill.values.BRA: BRA is not on the "europe" sheet. Sheets that hold every country: world.
   spec: unknown key "titel".
   ```

3. Standard Schema: `Spec` implements it, so libraries that accept one validate with it directly.
4. Streaming: a spec can be drawn while it streams. Once the first country arrives the map is known, and each later value only colours its country.

Let the model pick the map and the host supply the numbers. A model should not invent the values it charts.

## API

| Export                              | What it does                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `parse(input)`                      | Reads untrusted input into a `Spec`, or returns every issue.                          |
| `schema`, `Spec`                    | The spec as JSON Schema and as Standard Schema.                                       |
| `draw(spec, { locale })`            | Picks and loads the sheet, groups the values into colour bands and returns a `Scene`. |
| `svg(scene, { palette })`           | Turns a scene into a standalone SVG document with its legend and credits.             |
| `paint(tone, { classes, palette })` | The colour of a shape's tone. `light` and `dark` are the built-in palettes.           |
| `range(bin)`                        | A legend band as text: "4 to 6", "10 and above".                                      |

A scene is plain data, so you can draw it however your interface needs:

1. Contents: SVG paths, a tone per shape (a shade index, not a colour), insets, the legend, credits, a data table (`rows`) and a one-sentence description.
2. One coordinate space per sheet: a renderer can animate fills, zoom or pan without touching the geometry.
3. Renderers: `svg` is one. The stories show others, in plain DOM and in React, Vue, Svelte and Solid.

## Examples

Run the Storybook stories with `pnpm storybook`:

- Use cases: choropleth, highlight, fixed breaks, a country with its subdivisions, dark palette, French locale, every sheet.
- From a model: a spec playground, typical model mistakes and the tool schema.
- Motion: values revealed in order, years played over a slider, a highlight tour, hover details, a spec drawn while it streams, zoom and drag.
- Regions: one story per region.
- Colour scales: a sequential ramp of your own, and a diverging scale centred on zero. Colours belong to the renderer's palette, never to the spec.
- Layouts: layouts written in JSX.
- Frameworks: React, Vue, Svelte and Solid recipes to copy into an app, in `stories/frameworks/`. Each is a set of parts (`Figure.Root`, `Figure.Map`, `Figure.Legend`…) that share one context.

## The spec

| Field             | Meaning                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `sheet`           | `"world"`, a region id such as `"europe"`, the alpha-3 code of a country with its own map, or a layout. Optional. |
| `title`, `source` | Text shown with the map. `source` names who published the values.                                                 |
| `fill`            | `{ kind: "choropleth", values, scale?, better? }` or `{ kind: "highlight", countries }`.                          |

A few things:

1. Values: `values` maps ISO 3166-1 alpha-3 codes to numbers.
2. Colour bands, called classes: `scale` is `{ kind: "quantile", classes?: 3–7 }` or `{ kind: "breaks", at: [...] }`. Quantile is the default, with 5 classes of about as many countries each. Breaks set fixed boundaries.
3. Ties: equal values always share a class.

## Layouts

A layout draws any set of countries, as in [the comparison above](#compare-countries-far-apart-at-the-same-scale). Pass it as `sheet`:

| Field     | Meaning                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `places`  | Country codes, region ids, `"world"`, or `{ country, insets }`. Defaults to the countries in the fill.  |
| `panels`  | `[{ places }]`, drawn left to right as given. Use instead of `places`.                                  |
| `scale`   | `"shared"` (default): a kilometre is as long in every panel. `"fit"`: every panel equally tall.         |
| `insets`  | Draw the boxes a sheet gives a country's far parts, such as Hawaii or the Canaries. Defaults to `true`. |
| `context` | Draw the land and countries around the panel's countries in grey. Defaults to `true`.                   |

A few things:

1. Sheets decide the details: a panel keeps its sheet's projection and choices. The North America sheet draws Alaska in place, so a United States panel includes it.
2. Shared scale: the sheets are equal-area, so each sheet's units per kilometre come from its countries' areas.
3. JSX: the "Layouts" stories write layouts as `<Sheet>`, `<Panel>` and `<Country>`.

## Bundle size

The package has no runtime dependencies. Everything is lazily-loaded to reduce bundle size.

Bundled with Vite, tree-shaken and minified:

| Map           | Sheet, gzip | With `draw` and `svg`, gzip | With `parse` and `schema` too, gzip |
| ------------- | ----------: | --------------------------: | ----------------------------------: |
| World         |      8.3 kB |                     20.4 kB |                             23.5 kB |
| North America |     10.5 kB |                     22.6 kB |                             25.7 kB |
| Europe        |      9.8 kB |                     21.9 kB |                             24.9 kB |
| East Asia     |      3.9 kB |                     16.0 kB |                             19.1 kB |
| United States |      8.8 kB |                     20.9 kB |                             24.0 kB |
| France        |      6.0 kB |                     18.1 kB |                             21.2 kB |
| Germany       |      6.9 kB |                     19.0 kB |                             22.1 kB |
| China         |      6.1 kB |                     18.2 kB |                             21.3 kB |
| Japan         |      6.7 kB |                     18.8 kB |                             21.9 kB |

It ships 242 sheets: the world, 29 regions and 212 countries with their subdivisions. [docs/bundle-size.md](docs/bundle-size.md) adds Brotli sizes and the size of every file in `dist/`.

## Development

```sh
pnpm install
pnpm check       # format, lint, typecheck, test, build
pnpm storybook   # http://localhost:6007
pnpm sizes       # regenerate docs/bundle-size.md
pnpm readme      # redraw the README's example maps
```

## Where the geometry comes from

1. Sheets: civicdata's `packages/maps` generator (commit `6c2d279`) wrote `src/data/*.gen.ts`. Mapshaper then simplified them with Douglas-Peucker at 1 sheet unit, on shared arcs so borders between neighbours stay aligned. The generator, its sources and the simplification step are not in this repository yet, so the sheets cannot be regenerated here.
2. Layouts: `scripts/globe.ts` writes `src/data/globe.gen.ts`, each country's box in degrees and its area, from Natural Earth's 1:50m countries, v5.1.2. The script's header says how to fetch the source and run it.

See [LICENSE.md](LICENSE.md): the code is MIT, and each sheet keeps its source's licence.
