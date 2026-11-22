import type { Country, Values } from "../src/index.ts"

// A choropleth's values written as a record, the shortest way to read them
// in a test: `values({ FRA: 1 })` is `[{ country: "FRA", value: 1 }]`.
export const values = (record: Readonly<Partial<Record<Country, number>>>): Values =>
  Object.entries(record).map(([country, value]) => ({
    country: country as Country,
    value: value ?? 0,
  }))
