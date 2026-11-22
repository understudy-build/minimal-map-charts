# @understudy-build/minimal-map-charts

Minimal map charts for generative UI with a focus on composability and small bundle size.

It draws charts, not slippy maps: no tiles, no pan and zoom, and no geography beyond countries and their subdivisions. Use MapLibre for those, and Vega-Lite, Observable Plot or D3 for other charts.

## Quick start

```sh
pnpm add @understudy-build/minimal-map-charts
# or
bun add @understudy-build/minimal-map-charts
```

```ts
import { dark, draw, light, parse, svg } from "@understudy-build/minimal-map-charts"

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

const drawn = parsed.ok ? await draw(parsed.spec) : parsed

if (drawn.ok) document.body.innerHTML = svg(drawn.scene, { palette: { light, dark } })
```

1. The map is picked for you: these countries are all in Europe, so it draws Europe. Add the United States and it draws the world. Set `sheet` to choose, e.g. `"FRA"` for France and its regions.
2. `{ light, dark }` follows the page's `color-scheme`, so declare it: `:root { color-scheme: light dark }`. Without it, the map stays light. WebKit also draws it light as a file or an `<img>`.
3. Pass one palette, `{ palette: dark }`, for a map with its own background: images, link previews, email.

## Agentic usage

### Generate map charts from a JSON object

Give the model the spec's JSON Schema as a tool, then parse and draw what it sends. Each problem comes back as a line the model can fix.

```ts
import { describe, draw, parse, schema, svg } from "@understudy-build/minimal-map-charts"

const tool = { name: "show_map", description: "Draw a map of countries", input_schema: schema }

const call = async (input: unknown) => {
  const parsed = parse(input)
  const drawn = parsed.ok ? await draw(parsed.spec) : parsed

  return drawn.ok ? { svg: svg(drawn.scene) } : { error: drawn.issues.map(describe).join("\n") }
}
```

Asked which countries use the euro, the model sends:

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

Had it written `"France"`, it would get back `fill.countries.0: "France" is not a country code. Did you mean "FRA"?`. [Use it with a model](docs/models.md) covers colours, strict mode and streaming.

### MCP apps

[examples/mcp-app](examples/mcp-app) is an MCP server whose `show_map` tool shows the map in the host's chat as an [MCP App](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp):

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
    const drawn = await draw(spec)

    return drawn.ok
      ? {
          content: [{ type: "text", text: drawn.scene.description }],
          structuredContent: { ...drawn.scene },
        }
      : { content: [{ type: "text", text: drawn.issues.map(describe).join("\n") }], isError: true }
  },
)
```

1. `Spec` is a Standard Schema, so the SDK refuses a bad call with `parse`'s issues.
2. The server draws: an MCP App's default CSP blocks the view from loading sheets. The view gets the scene and paints it with `svg` in the host's theme.
3. The model reads only `scene.description`, one sentence. `structuredContent` goes to the view.
4. `pnpm mcp` builds the view and starts the server over stdio.

### JSON-render & A2UI

The map is one component in the catalog, and its props are the spec. `stories/standards/` holds both integrations:

1. json-render: `props: z.fromJSONSchema(schema)`.
2. A2UI: `stories/standards/a2ui.ts` is a v1.0 catalog with one `Map` component, checked against A2UI's catalog schema.
3. Both components run `parse` and `draw` and show their issues, which catch what a schema cannot.

### HTML page or a shell

When a model writes HTML (an artifact, a chat preview), `<map-chart>` takes the spec as JSON, with no script to write:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@understudy-build/minimal-map-charts@0/dist/element.js"
></script>
<map-chart
  ><script type="application/json">
    {
      "title": "Euro area founders, 1999",
      "fill": {
        "kind": "highlight",
        "countries": ["AUT", "BEL", "FIN", "FRA", "DEU", "IRL", "ITA", "LUX", "NLD", "PRT", "ESP"]
      }
    }
  </script></map-chart
>
```

1. A bad spec shows its issues in place of the map and logs them with `console.error`, which hosts report back to the model.
2. The element reserves the map's height before the sheet loads, so a host that measures the page early gets it right. Layouts are the exception.
3. It follows the page's `color-scheme`, and draws again when the JSON changes.

With a shell, the CLI writes the same spec to SVG. A bad spec prints its issues to stderr and exits 1:

```sh
npx @understudy-build/minimal-map-charts render spec.json > map.svg
cat spec.json | npx @understudy-build/minimal-map-charts render --palette dark > map.svg
```

[llms.txt](llms.txt), shipped in the package, puts the spec, both snippets and three examples on one page for a model.

## Bundle size

No runtime dependencies. Each sheet loads when a map draws it, so a page pays for the code and one sheet. Bundled with Vite:

<!-- sizes:maps -->

| Map              | Sheet, gzip | With `draw` and `svg`, gzip | With `parse` and `schema` too, gzip |
| ---------------- | ----------: | --------------------------: | ----------------------------------: |
| World            |      8.5 kB |                     26.7 kB |                             33.5 kB |
| North America    |     10.7 kB |                     28.8 kB |                             35.7 kB |
| Europe           |     10.1 kB |                     28.3 kB |                             35.1 kB |
| Asia (East Asia) |      4.0 kB |                     22.2 kB |                             29.0 kB |
| United States    |      8.9 kB |                     27.1 kB |                             34.0 kB |
| France           |      6.2 kB |                     24.4 kB |                             31.2 kB |
| Germany          |      7.0 kB |                     25.2 kB |                             32.0 kB |
| China            |      6.0 kB |                     24.2 kB |                             31.0 kB |
| Japan            |      6.8 kB |                     25.0 kB |                             31.8 kB |

<!-- /sizes:maps -->

There are 242 sheets: the world, 29 regions and 212 countries with their subdivisions. Points named by city add that country's places: 0.5 kB for the median country, 11.2 kB for the United States. [docs/bundle-size.md](docs/bundle-size.md) has every file.

## Development

```sh
pnpm install
pnpm check       # format, lint, typecheck, test, build
pnpm storybook   # every use case, and React, Vue, Svelte and Solid recipes
pnpm sizes       # regenerate docs/bundle-size.md and the table above
pnpm readme      # redraw the example maps in the README and docs/maps.md
pnpm build:maps  # regenerate src/data/ from the pinned source snapshots
pnpm audit:borders  # list land two sheets give to different countries
```

## Documentation

- [Maps](docs/maps.md): countries far apart at one scale, states and regions, points at cities.
- [Use it with a model](docs/models.md): colours, schemas, issues and streaming.
- [The spec](docs/spec.md): every field and layout option.
- [API](docs/api.md): every export and what a scene holds.
- [Map data](docs/data.md): disputed borders, and where the geometry comes from.

The code is MIT. Each sheet keeps its source's licence: see [LICENSE.md](LICENSE.md).
