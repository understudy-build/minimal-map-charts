import { Allow, parse as heal } from "partial-json"
import { describe, expect, it } from "vitest"

import { parse, partial, type Spec } from "../src/index.ts"

// Every chunk a stream yields for this JSON text, healed as hosts heal it:
// open strings, arrays and objects closed, a key with no value dropped.
const chunks = (text: string): ReadonlyArray<unknown> =>
  Array.from({ length: text.length }, (_, index) => {
    try {
      return [heal(text.slice(0, index + 1), Allow.ALL)]
    } catch {
      return []
    }
  }).flat()

// Whether everything `shown` holds is in `final`: text may stop short, a
// list may stop short, and anything else is exactly as it will be.
const within = (shown: unknown, final: unknown): boolean => {
  if (typeof shown === "string") return typeof final === "string" && final.startsWith(shown)
  if (Array.isArray(shown))
    return Array.isArray(final) && shown.every((each, index) => within(each, final[index]))
  if (typeof shown === "object" && shown !== null)
    return (
      typeof final === "object" &&
      final !== null &&
      Object.entries(shown).every(([key, each]) =>
        within(each, (final as Record<string, unknown>)[key]),
      )
    )

  return Object.is(shown, final)
}

const specs: ReadonlyArray<readonly [string, Spec]> = [
  [
    "a choropleth with fixed breaks",
    {
      title: "Unemployment rate, %",
      source: "Illustrative values",
      fill: {
        kind: "choropleth",
        scale: { kind: "breaks", at: [4, 6, 8, 10] },
        values: [
          { country: "FRA", value: 7.4 },
          { country: "DEU", value: 3.25 },
          { country: "ESP", value: 11.5 },
        ],
        better: "lower",
      },
    },
  ],
  [
    "a diverging choropleth",
    {
      fill: {
        kind: "choropleth",
        values: [
          { country: "POL", value: -1.5 },
          { country: "ITA", value: 0.25 },
        ],
        scale: { kind: "diverging", at: [-1, 1], mid: 0, below: "#c62828", above: "#1565c0" },
      },
    },
  ],
  [
    "a highlight on a layout",
    {
      sheet: { places: ["USA", { country: "FRA", insets: false }], scale: "fit" },
      title: "Members",
      fill: { kind: "highlight", countries: ["USA", "FRA"], colour: "#ef6c00" },
    },
  ],
]

describe("partial", () => {
  it.each(specs)("never shows what %s will not hold once complete", (_, spec) => {
    const text = JSON.stringify(spec)
    const shown = chunks(text).map(partial)

    expect(shown.length).toBeGreaterThan(text.length / 2)
    for (const each of shown) expect(within(each, spec)).toBe(true)
    expect(parse(JSON.parse(text))).toEqual({ ok: true, spec })
  })

  it.each(specs)("shows %s whole one chunk before the end", (_, spec) => {
    const text = JSON.stringify(spec)

    // The last chunk only closes the outer object.
    expect(partial(heal(text.slice(0, -1), Allow.ALL))).toEqual(spec)
  })

  it("holds back the number a stream ends on, which may gain digits", () => {
    const cut = heal(
      '{"fill":{"kind":"choropleth","values":[{"country":"FRA","value":1.2',
      Allow.ALL,
    )

    expect(partial(cut)).toEqual({ fill: { kind: "choropleth", values: [] } })
  })

  it("leaves out a code half written, and text reads as far as it goes", () => {
    const cut = heal('{"title":"Euro ar', Allow.ALL)
    const codes = heal('{"fill":{"kind":"highlight","countries":["FRA","DE', Allow.ALL)

    expect(partial(cut)).toEqual({ title: "Euro ar" })
    expect(partial(codes)).toEqual({ fill: { kind: "highlight", countries: ["FRA"] } })
  })

  it("leaves out what parse would refuse, and keeps the rest", () => {
    const input = {
      titel: "GDP",
      title: "GDP",
      fill: {
        kind: "choropleth",
        values: [
          { country: "France", value: 1 },
          { country: "DEU", value: 2 },
        ],
        scale: { kind: "diverging", at: [0], mid: 0, below: "#c62828" },
      },
    }

    expect(partial(input)).toEqual({
      title: "GDP",
      fill: { kind: "choropleth", values: [{ country: "DEU", value: 2 }] },
    })
  })

  it("never fails", () => {
    expect(partial(undefined)).toEqual({})
    expect(partial("a map of Europe")).toEqual({})
    expect(partial({ fill: {} })).toEqual({})
  })
})
