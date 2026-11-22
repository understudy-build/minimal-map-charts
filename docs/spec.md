# The spec

| Field             | Meaning                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sheet`           | `"world"`, a region such as `"europe"`, a country's alpha-3 code for its own map, or a layout. Optional.                                                        |
| `title`, `source` | Text shown with the map. `source` names who published the values.                                                                                               |
| `fill`            | `{ kind: "choropleth", values, scale?, better? }`, or `{ kind: "highlight", countries, colour? }`, with `areas` instead of `countries` for one country's areas. |
| `points`          | `{ kind: "dot" \| "bubble", sites, label?, colour? }`. Each site is `{ name, lat, lon }` or `{ place, country, area?, name? }`, plus `value` for bubbles.       |

1. Values: `{ country, value }` pairs with ISO 3166-1 alpha-3 codes, or `{ area, value }` pairs with ISO 3166-2 codes of one country. Each code appears once.
2. Scales: `{ kind: "quantile", classes?: 3–7, colour? }` (the default, 5 classes), `{ kind: "breaks", at: [...], colour? }` or `{ kind: "diverging", at: [...], mid, below, above }`. Equal values always share a class.
3. Diverging: values below `mid` take `below`'s hue and values above take `above`'s, stronger further from `mid`. The hues must be 60° apart, and `mid` must sit between the first and last breaks.
4. Colours: `"#rrggbb"`, not a grey. A point colour must be 60° from the fill's.

## Layouts

A layout puts any set of countries side by side, as in [Maps](maps.md#compare-countries-far-apart-at-the-same-scale). Pass it as `sheet`:

| Field     | Meaning                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------- |
| `places`  | Country codes, region ids, `"world"`, or `{ country, insets }`. Defaults to the fill's countries. |
| `panels`  | `[{ places }]`, drawn left to right. Use instead of `places`.                                     |
| `scale`   | `"shared"` (default): a kilometre is as long in every panel. `"fit"`: panels are equally tall.    |
| `insets`  | Draw far-off parts, such as Hawaii or the Canaries, in boxes. Defaults to `true`.                 |
| `context` | Draw neighbouring land in grey. Defaults to `true`.                                               |

Each panel keeps its sheet's choices: the North America sheet draws Alaska in place, so a United States panel includes it. The "Layouts" stories write layouts in JSX.
