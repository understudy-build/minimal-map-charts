# Use it with a model

The spec says what to show: countries, values and what the colours mean. Projections, joins and lightness are the package's job, so the shortest valid spec is a correct map.

Let the model pick the map and the host supply the numbers. A model should not invent the values it charts.

1. Colours: the model picks a hue as `"#rrggbb"`, such as green for forests or red for losses. The package keeps its hue and sets its lightness, so one spec reads on light and dark pages.
2. Schemas: `schema` is the spec as JSON Schema, within what strict structured output accepts. `strict` makes every key required and nullable, for OpenAI's strict mode; `parse` reads `null` as left out. `Spec` is the same spec as a Standard Schema, for libraries and SDKs that take one.
3. Issues: `parse` checks the spec, `draw` checks area and place names against what it loads, and `describe` turns each issue into a line:

   ```
   fill.values.0.country: "France" is not a country code. Did you mean "FRA"?
   fill.values.2: BRA is not on the "europe" sheet. Sheets that hold every country: world.
   spec: unknown key "titel".
   ```

4. Streaming: `partial(input)` reads a spec cut short mid-stream and never fails. Draw each chunk with it and the final input with `parse`. The map appears with the first country, and each value colours its country as it arrives.
