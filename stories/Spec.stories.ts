import type { Meta, StoryObj } from "@storybook/html-vite"

import { describe, draw, parse, schema } from "../src/index.ts"
import { figure } from "./figure.ts"

interface PlaygroundArgs {
  // Raw input, as a model or a form would send it. Edit it in the controls.
  readonly input: unknown
}

const issues = (lines: ReadonlyArray<string>) => {
  const list = document.createElement("ul")

  list.setAttribute("role", "alert")
  list.style.cssText = "font-family:ui-monospace,monospace;color:#d03b3b;max-width:900px"
  list.append(
    ...lines.map((line) => {
      const item = document.createElement("li")

      item.textContent = line

      return item
    }),
  )

  return list
}

// What a host does with a model's output: parse it, then draw it, or hand
// the issues back to the model so it can fix the spec itself.
const meta = {
  title: "Maps/From a model",
  loaders: [
    async ({ args }) => {
      const parsed = parse(args.input)

      return parsed.ok
        ? { scene: await draw(parsed.spec), issues: [] }
        : { scene: undefined, issues: parsed.issues.map(describe) }
    },
  ],
  render: (_, { loaded }) =>
    loaded["scene"] === undefined ? issues(loaded["issues"]) : figure(loaded["scene"]),
} satisfies Meta<PlaygroundArgs>

export default meta

type Story = StoryObj<PlaygroundArgs>

export const Valid: Story = {
  args: {
    input: {
      title: "Internet users, % of population",
      source: "Illustrative values",
      fill: {
        kind: "choropleth",
        values: [
          { country: "JPN", value: 83 },
          { country: "KOR", value: 97 },
          { country: "CHN", value: 76 },
          { country: "MNG", value: 84 },
          { country: "PRK", value: 0.1 },
          { country: "TWN", value: 90 },
        ],
        scale: { kind: "quantile", classes: 4 },
        better: "higher",
      },
    },
  },
}

// Typical model mistakes: names instead of codes, a typo in a key, and a
// country off the sheet it asked for. Each issue says how to fix it.
export const Mistakes: Story = {
  args: {
    input: {
      sheet: "europe",
      titel: "GDP",
      fill: {
        kind: "choropleth",
        values: [
          { country: "France", value: 1.2 },
          { country: "DE", value: 0.3 },
          { country: "BRA", value: 2.9 },
        ],
      },
    },
  },
}

export const OffTheSheet: Story = {
  args: {
    input: { sheet: "europe", fill: { kind: "highlight", countries: ["FRA", "BRA"] } },
  },
}

// The JSON Schema a host gives a model as the tool's input schema.
export const ToolSchema: StoryObj = {
  render: () => {
    const block = document.createElement("pre")

    block.style.cssText = "font-size:12px;max-height:80vh;overflow:auto"
    block.textContent = JSON.stringify(
      { ...schema, $defs: { ...schema.$defs, country: { ...schema.$defs.country, enum: ["…"] } } },
      null,
      2,
    )

    return block
  },
}
