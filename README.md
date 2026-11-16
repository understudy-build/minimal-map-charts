# @nicolastoulemont/minimal-maps

Small map primitives for generative UI. A model writes a few lines of JSON naming countries and values; `parse` checks them, `draw` picks the map and returns a scene, and you draw that scene however your interface needs: an SVG string, DOM nodes, a React component, an animation.

The package has no runtime dependencies. Bundled and tree-shaken, `draw` and `svg` cost 11.7 kB gzipped, and each map adds one pre-projected sheet: a map of Europe comes to 21.5 kB in all, France with its regions to 17.7 kB. It ships 242 sheets: the world, 29 regions and 212 countries with their subdivisions.

```ts
import { draw, parse, svg } from "@nicolastoulemont/minimal-maps"

const parsed = parse({
  title: "GDP growth, 2024 (%)",
  source: "World Bank",
  fill: { kind: "choropleth", values: { FRA: 1.1, DEU: -0.2, ESP: 3.2 }, better: "higher" },
})

if (parsed.ok) document.body.innerHTML = svg(await draw(parsed.spec))
```

There is no `sheet` in that spec: every country in the fill is in Europe, so the map draws Europe. Add the United States and it draws the world. Name a sheet to override that, for example `"sheet": "FRA"` for France with its regions and overseas insets. `scene.choice` says whether the sheet was given or derived.

## For model output

The spec describes the subject, not the chart: countries and values, never projections, joins or colours. The shortest valid spec is a correct map, so a model has few ways to get it wrong.

- `schema` is the spec as JSON Schema, for a tool's input schema or structured output.
- `parse` returns typed issues written for the model to fix on its next turn:

  ```
  fill.values.France: "France" is not a country code. Did you mean "FRA"?
  fill.values.BRA: BRA is not on the "europe" sheet. Sheets that hold every country: world.
  spec: unknown key "titel".
  ```

- `Spec` implements Standard Schema, so libraries that accept one validate with it directly.
- A spec can be drawn while it streams: once the first country arrives the frame is known, and each later value only colours its country.

Have the model choose the map and the host supply the numbers. A model should not invent the values it charts.

## Primitives

| Export                              | What it does                                                                |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `parse(input)`                      | Reads untrusted input into a `Spec`, or returns every issue.                |
| `schema`, `Spec`                    | The spec as JSON Schema and as Standard Schema.                             |
| `draw(spec, { locale })`            | Picks and loads the sheet, classes the values and returns a `Scene`.        |
| `svg(scene, { palette })`           | Turns a scene into a standalone SVG document with its legend and credits.   |
| `paint(tone, { classes, palette })` | The colour of a shape's tone. `light` and `dark` are the built-in palettes. |
| `range(bin)`                        | A legend bin as text: "4 to 6", "10 and above".                             |

A scene is plain data: SVG paths in sheet units, a tone per shape (a shade index, not a colour), insets, the legend, boundary credits, a data table (`rows`) and a one-sentence description. Every sheet keeps one coordinate space, so a renderer can animate fills, zoom by moving the viewBox, or pan by dragging without touching the geometry. `svg` is one renderer; the stories show others.

The Storybook stories are the examples, run with `pnpm storybook`:

- Use cases: choropleth, highlight, fixed breaks, a country with its subdivisions, dark palette, French locale, every sheet.
- From a model: a spec playground, typical model mistakes and the tool schema.
- Motion: values revealed in order, years played over a shadcn slider, a highlight tour, hover details, a spec drawn while it streams, zooming inside a sheet, and dragging to move.
- Regions: one story per region.

## The spec

| Field             | Meaning                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `sheet`           | `"world"`, a region id such as `"europe"`, or the alpha-3 code of a country with its own map. Optional. |
| `title`, `source` | Text shown with the map. `source` names who published the values.                                       |
| `fill`            | `{ kind: "choropleth", values, scale?, better? }` or `{ kind: "highlight", countries }`.                |

`values` maps ISO 3166-1 alpha-3 codes to numbers. `scale` is `{ kind: "quantile", classes?: 3–7 }` (the default, 5 classes) or `{ kind: "breaks", at: [...] }` for fixed bands. Equal values always share a class.

## Bundle size

Each sheet is its own chunk, loaded with `import()` the first time it is drawn, so a page downloads the code it imports plus the one sheet it shows. Bundled with Vite, tree-shaken and minified:

| Map           | Sheet, gzip | With `draw` and `svg`, gzip | With `parse` and `schema` too, gzip |
| ------------- | ----------: | --------------------------: | ----------------------------------: |
| World         |      8.3 kB |                     20.0 kB |                             22.1 kB |
| North America |     10.5 kB |                     22.2 kB |                             24.3 kB |
| Europe        |      9.8 kB |                     21.5 kB |                             23.6 kB |
| East Asia     |      3.9 kB |                     15.6 kB |                             17.7 kB |
| United States |      8.8 kB |                     20.5 kB |                             22.6 kB |
| France        |      6.0 kB |                     17.7 kB |                             19.8 kB |
| Germany       |      6.9 kB |                     18.6 kB |                             20.7 kB |
| China         |      6.1 kB |                     17.9 kB |                             19.9 kB |
| Japan         |      6.7 kB |                     18.4 kB |                             20.5 kB |

[docs/bundle-size.md](docs/bundle-size.md) has these with Brotli sizes, and the raw, gzip and Brotli size of every file in `dist/`, with the sheets grouped into world, regions and countries. `pnpm sizes` rebuilds the package, bundles these maps again and regenerates it.

## Where it fits

It draws country choropleths and highlights, nothing else. For other chart types, or geographies it does not ship, Vega-Lite or D3 fit better. For maps people pan and zoom across tiles, use MapLibre.

## Development

```sh
pnpm install
pnpm check       # format, lint, typecheck, test, build
pnpm storybook   # http://localhost:6007
pnpm sizes       # regenerate docs/bundle-size.md
```

## Where the geometry comes from

`src/data/*.gen.ts` was generated by civicdata's `packages/maps` generator (commit `6c2d279`), then simplified with mapshaper's Douglas-Peucker at 1 sheet unit on shared arcs, which keeps borders between neighbours aligned. The generator, its source snapshots and the simplification step are not part of this repository yet, so the geometry cannot be regenerated here.

See [LICENSE.md](LICENSE.md): the code is MIT; each sheet keeps its source's licence.
