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

<!-- prettier-ignore -->
```json
{
  "sheet": { "places": ["USA", "GBR", "FRA", "ESP", "BEL", "NLD", "DEU", "ITA"], "insets": false },
  "title": "GDP growth, 2024 (%)",
  "source": "Illustrative values",
  "fill": {
    "kind": "choropleth",
    "values": [
      { "country": "USA", "value": 2.8 },
      { "country": "GBR", "value": 1.1 },
      { "country": "FRA", "value": 1.1 },
      { "country": "ESP", "value": 3.2 },
      { "country": "BEL", "value": 1 },
      { "country": "NLD", "value": 0.9 },
      { "country": "DEU", "value": -0.2 },
      { "country": "ITA", "value": 0.7 }
    ],
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
  fill: {
    kind: "choropleth",
    values: [
      { country: "FRA", value: 1.1 },
      { country: "DEU", value: -0.2 },
      { country: "ESP", value: 3.2 },
    ],
    better: "higher",
  },
})

if (parsed.ok) document.body.innerHTML = svg(await draw(parsed.spec))
```

A few things:

1. The map is inferred: every country in the fill is in Europe, so it draws Europe. Add the United States and it draws the world.
2. `sheet` overrides it: `"sheet": "FRA"` draws France with its regions and overseas insets. `scene.choice` is `"Given"` or `"Derived"`.

## Use it with a model

The spec describes what to show, not how to draw it: countries, values and what the colours mean, never projections, joins or lightness. The shortest valid spec is a correct map, so a model has few ways to get it wrong.

A model picks colours as `"#rrggbb"`: green for forests, red for losses, blue for gains. The renderer keeps each colour's hue and chroma and sets its lightness for the page, so one spec reads on a light or a dark surface, with the lowest values nearest the surface.

1. Tool schema: `schema` is the spec as JSON Schema, for a tool's input or for structured output. It keeps to what strict structured output accepts: `anyOf`, closed objects, and values as `{ country, value }` pairs rather than a map keyed by country. `strict` is the same spec with every key required and null for the ones left out, for OpenAI's strict mode; `parse` reads a null key as left out.
2. Validation: `parse` returns typed issues, and `describe` turns each into a line the model can fix on its next turn:

   ```
   fill.values.0.country: "France" is not a country code. Did you mean "FRA"?
   fill.values.2: BRA is not on the "europe" sheet. Sheets that hold every country: world.
   spec: unknown key "titel".
   ```

3. Standard Schema: `Spec` implements it with its JSON Schema extension, so a library that takes one gets both the validator and the JSON Schema from it. An MCP server registers the spec as a tool's input with `inputSchema: Spec`, and a model that sends a bad spec gets `describe`'s lines back.
4. Streaming: `partial(input)` reads a spec from a stream cut short, the JSON written so far with its brackets closed, as tool-call and structured-output streams yield it. It never fails: a number that may still gain digits and a code half written wait for the next chunk. Draw each chunk with `partial` and the finished input with `parse`. Once the first country arrives the map is known, and each later value only colours its country.

Let the model pick the map and the host supply the numbers. A model should not invent the values it charts.

### In an MCP App

[examples/mcp-app](examples/mcp-app) is an MCP server with one tool, `show_map`, whose map shows in the host's chat as an [MCP App](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp):

```ts
registerAppTool(
  mcp,
  "show_map",
  {
    description: "Draw a map of countries",
    inputSchema: Spec,
    _meta: { ui: { resourceUri: view } },
  },
  async (spec) => {
    const scene = await draw(spec)

    return { content: [{ type: "text", text: scene.description }], structuredContent: { ...scene } }
  },
)
```

A few things:

1. No glue: `Spec` is the tool's input schema as it is. The SDK lists its JSON Schema to the model and refuses a bad call with `parse`'s issues.
2. The server draws, the view paints: an MCP App's default CSP blocks network requests, so the view cannot load sheets. It gets the scene, paints it with `svg` in the host's theme, and paints it again when the theme changes.
3. The model reads one sentence, `scene.description`. The scene goes to the view in `structuredContent`, which the model does not see.
4. `pnpm mcp` builds the view into one HTML file and starts the server over stdio.

### In json-render and A2UI

Both take a catalog of components and let the model compose them. The map is one component, its props the spec. The recipes in `stories/standards/` are the whole integration:

1. json-render: `props: z.fromJSONSchema(schema)`. Zod reads the JSON Schema as it is, so the catalog's prompt lists every key and code, and `catalog.validate` refuses what the schema refuses.
2. A2UI: `catalog` in `stories/standards/a2ui.ts` is an A2UI v1.0 catalog with one `Map` component. It adds the component name, the catalog id and the unions every catalog declares to the spec's schema; a test checks it against A2UI's own catalog schema. The renderer builds its component from the same document with `Catalog.fromJson`, so it checks an agent's message against the schema the agent was given.
3. Both components still run `parse`, which holds the rules no schema states, and show its lines when a spec does not parse.

## API

| Export                     | What it does                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `parse(input)`             | Reads untrusted input into a `Spec`, or returns every issue.                          |
| `partial(input)`           | Reads a spec from a stream cut short. Never fails.                                    |
| `schema`, `strict`, `Spec` | The spec as JSON Schema, as JSON Schema for strict mode, and as Standard Schema.      |
| `draw(spec, { locale })`   | Picks and loads the sheet, groups the values into colour bands and returns a `Scene`. |
| `svg(scene, { palette })`  | Turns a scene into a standalone SVG document with its legend and credits.             |
| `paint(tone, { palette })` | The colour of a shape's tone. `light` and `dark` are the built-in palettes.           |
| `range(bin)`               | A legend band as text: "4 to 6", "10 and above".                                      |

A scene is plain data, so you can draw it however your interface needs:

1. Contents: SVG paths, a tone per shape (the spec's colour and a strength from 0 to 1, not a final colour), insets, the legend, credits, a data table (`rows`) and a one-sentence description.
2. One coordinate space per sheet: a renderer can animate fills, zoom or pan without touching the geometry.
3. Renderers: `svg` is one. The stories show others, in plain DOM and in React, Vue, Svelte and Solid.

## Examples

Run the Storybook stories with `pnpm storybook`:

- Use cases: choropleth, highlight, fixed breaks, a country with its subdivisions, dark palette, French locale, every sheet.
- From a model: a spec playground, typical model mistakes and the tool schema.
- Motion: values revealed in order, years played over a slider, a highlight tour, hover details, a spec drawn while it streams, zoom and drag.
- Regions: one story per region.
- Colour scales: a sequential scale in one colour, a diverging scale around zero, and a coloured highlight, each in light and dark.
- Layouts: layouts written in JSX.
- Frameworks: React, Vue, Svelte and Solid recipes to copy into an app, in `stories/frameworks/`. Each is a set of parts (`Figure.Root`, `Figure.Map`, `Figure.Legend`…) that share one context.
- Standards: the map as a json-render component and as an A2UI component, with the prompt and the catalog each gives a model.

## The spec

| Field             | Meaning                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `sheet`           | `"world"`, a region id such as `"europe"`, the alpha-3 code of a country with its own map, or a layout. Optional. |
| `title`, `source` | Text shown with the map. `source` names who published the values.                                                 |
| `fill`            | `{ kind: "choropleth", values, scale?, better? }` or `{ kind: "highlight", countries, colour? }`.                 |

A few things:

1. Values: `values` lists `{ country, value }` pairs, each country an ISO 3166-1 alpha-3 code listed once.
2. Colour bands, called classes: `scale` is `{ kind: "quantile", classes?: 3–7, colour? }`, `{ kind: "breaks", at: [...], colour? }` or `{ kind: "diverging", at: [...], mid, below, above }`. Quantile is the default, with 5 classes of about as many countries each. Breaks set fixed boundaries.
3. Diverging: bands below `mid` take `below`'s hue and bands above take `above`'s, stronger the further from `mid`. A band holding `mid` is neutral; with `mid` on a break, none is. The hues must be at least 60° apart, and `mid` must lie between the first and last breaks.
4. Colours: `"#rrggbb"`, not a grey. Without one, the palette's colour applies.
5. Ties: equal values always share a class.

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
pnpm build:maps  # regenerate src/data/ from the pinned source snapshots
```

## Where the geometry comes from

1. Sheets: `pnpm build:maps` runs `scripts/build-maps/index.ts`, which writes every `src/data/*.gen.ts` but `globe.gen.ts`. It projects Natural Earth's countries (from `world-atlas`) for the world and the regions, and each country's subdivisions from one of 212 source snapshots. It then simplifies the rings with mapshaper's Douglas-Peucker at 1 sheet unit, on shared arcs so borders between neighbours stay aligned, and removes the spikes and flat rings left by rounding. The snapshots weigh 126 MB, so they are not in Git: the script downloads any missing one into the ignored `.archive/` folder before it starts, and checks it against the SHA-256 GitHub records for the asset. A changed source shows up as a diff in the committed `src/data`. They are assets of the [`sources-6c2d279`](https://github.com/nicolastoulemont/minimal-map-charts/releases/tag/sources-6c2d279) release; while this repository is private, run `GITHUB_TOKEN=$(gh auth token) pnpm build:maps`. The generator and the snapshots come from civicdata's `packages/maps` (commit `6c2d279`), and refreshing a snapshot from its publisher still happens there.
2. Layouts: `scripts/globe.ts` writes `src/data/globe.gen.ts`, each country's box in degrees and its area, from Natural Earth's 1:50m countries, v5.1.2. The script's header says how to fetch the source and run it.

See [LICENSE.md](LICENSE.md): the code is MIT, and each sheet keeps its source's licence.
