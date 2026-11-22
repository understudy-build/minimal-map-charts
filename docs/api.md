# API

| Export                     | What it does                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `parse(input)`             | Reads untrusted input into a `Spec`, or returns every issue. Loads nothing.                                                              |
| `partial(input)`           | Reads a spec cut short mid-stream. Never fails.                                                                                          |
| `schema`, `strict`, `Spec` | The spec as JSON Schema, as JSON Schema for strict mode, and as Standard Schema.                                                         |
| `describe(issue)`          | An issue as one line a model can act on.                                                                                                 |
| `draw(spec, { locale })`   | Loads the sheet and any named places. Returns `{ ok, scene }`, or `{ ok, issues }` for an unknown area or place, or a point off the map. |
| `svg(scene, { palette })`  | A standalone SVG with legend and credits. `{ light, dark }` follows the page's `color-scheme`.                                           |
| `paint(tone, { palette })` | A shape's colour. `light` and `dark` are the built-in palettes.                                                                          |
| `range(bin)`               | A legend band as text: "4 to 6", "10 and above".                                                                                         |
| `cite(credit)`             | The credit line a source's licence requires. Print `scene.credits.map(cite)` with any map you render yourself.                           |
| `size(spec)`               | The size `svg` will draw, before the sheet loads. `undefined` for a layout.                                                              |
| `sheetOf(spec)`            | The sheet or layout `draw` will use. Loads nothing.                                                                                      |

## The scene

A scene is plain data for your own renderer: SVG paths, a tone per shape (the spec's colour and a strength from 0 to 1), insets, the legend, point `marks`, credits, data rows and a one-sentence description. Each sheet has one coordinate space, so a renderer can animate fills, zoom or pan without touching the geometry. The stories render it in plain DOM, React, Vue, Svelte and Solid.
