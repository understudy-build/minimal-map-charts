import {
  type Country,
  describe,
  draw,
  type DrawOptions,
  type Scene,
  type Spec,
  type Values,
} from "../src/index.ts"

// A choropleth's values written as a record, the shortest way to read them
// in a test: `values({ FRA: 1 })` is `[{ country: "FRA", value: 1 }]`.
export const values = (record: Readonly<Partial<Record<Country, number>>>): Values =>
  Object.entries(record).map(([country, value]) => ({
    country: country as Country,
    value: value ?? 0,
  }))

// The scene a spec draws, for a test that expects one: a spec `draw`
// refuses fails the test with the lines a model would read.
export const drawn = async (spec: Spec, options?: DrawOptions): Promise<Scene> => {
  const result = await draw(spec, options)

  if (!result.ok) throw new Error(result.issues.map(describe).join("\n"))

  return result.scene
}
