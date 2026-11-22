import { footprints } from "./data/sheets.gen.ts"
import { sheetOf } from "./draw.ts"
import { named, type Spec } from "./spec.ts"
import { stack } from "./svg.ts"

// The viewBox `svg()` will give a spec's map, known before its sheet loads,
// so a page can reserve the map's height. A layout's size depends on the
// outlines of the countries it crops, so it is known only once drawn:
// `undefined`.
export const size = (
  spec: Spec,
): { readonly width: number; readonly height: number } | undefined => {
  const id = sheetOf(spec)

  if (typeof id === "object") return undefined

  const { width, height, insets, credits, absent = [] } = footprints[id]
  const target = named(spec.fill)
  const missing = target.kind === "countries" && target.codes.some((code) => absent.includes(code))

  return {
    width,
    height: stack({
      width,
      height,
      title: spec.title !== undefined,
      insets,
      legend: spec.fill?.kind === "choropleth",
      notes: Number(missing) + Number(spec.source !== undefined) + credits,
    }).height,
  }
}
