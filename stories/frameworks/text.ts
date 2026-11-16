import { paint, type Palette, range, type Scene } from "../../src/index.ts"

// What a figure's legend and credits say, with no framework in it. Each
// framework's recipe renders these the same way.

export interface Entry {
  readonly key: string
  readonly text: string
  // No swatch for the "Higher is better" note.
  readonly colour: string | undefined
}

// The legend's entries: which way is better, a swatch per bin, and "No data"
// when any country is blank.
export const entries = (scene: Scene, palette: Palette): ReadonlyArray<Entry> => {
  const key = scene.legend

  if (key === undefined) return []

  return [
    ...(key.better === undefined
      ? []
      : [
          {
            key: "better",
            text: key.better === "higher" ? "Higher is better" : "Lower is better",
            colour: undefined,
          },
        ]),
    ...key.bins.map((bin) => ({
      key: `bin ${bin.shade}`,
      text: range(bin),
      colour: paint({ kind: "shade", shade: bin.shade }, { classes: key.classes, palette }),
    })),
    ...(scene.shapes.some((shape) => shape.tone.kind === "blank")
      ? [{ key: "blank", text: "No data", colour: palette.blank }]
      : []),
  ]
}

// Who published the values and who drew the boundaries, in one line.
export const credit = (scene: Scene) =>
  [
    ...(scene.source === undefined ? [] : [`Data: ${scene.source}.`]),
    ...scene.credits.map(
      (each) => `Boundaries: ${each.publisher}, ${each.vintage}. ${each.license}.`,
    ),
  ].join(" ")

// What the details line says until the reader points at a country.
export const hint = "Point at a country, or tab to one, for its value."
