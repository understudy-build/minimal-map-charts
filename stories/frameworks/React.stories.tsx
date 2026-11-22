import type { Meta, StoryObj } from "@storybook/html-vite"
import { MotionConfig, motion } from "motion/react"
import { type ReactNode, Suspense, useState, useTransition } from "react"

import { type Country, dark, paint, parse, regions, type Spec } from "../../src/index.ts"
import { illustrative } from "../figure.ts"
import { Country as Place, Sheet, layout } from "../sheet.tsx"
import { Years } from "../years.tsx"
import { growth, offices, output } from "./examples.ts"
import { Figure, useDrawn, useFigure } from "./react/figure.tsx"
import { mount } from "./react/mount.tsx"

// The scene drawn with React: `useDrawn` loads it under Suspense, and the
// `Figure` parts render it as SVG and HTML. stories/frameworks/react/figure.tsx
// is the whole recipe.
const meta = {
  title: "Frameworks/React",
  parameters: {
    docs: { description: { component: "Maps rendered with React 19 from the same scene." } },
  },
} satisfies Meta

export default meta

const europe = regions.find((region) => region.id === "europe")?.countries ?? []

const drawing = (node: ReactNode) =>
  mount(<Suspense fallback={<p className="text-sm">Drawing the map…</p>}>{node}</Suspense>)

const Whole = ({ spec }: { readonly spec: Spec }) => (
  <Figure.Root drawn={useDrawn(spec)}>
    <Figure.Title />
    <Figure.Map />
    <Figure.Insets />
    <Figure.Legend />
    <Figure.Credits />
    <Figure.Table />
  </Figure.Root>
)

// Every part in its usual order. Edit the spec in the controls.
export const Basic: StoryObj<{ readonly spec: Spec }> = {
  args: { spec: growth },
  argTypes: { spec: { control: "object" } },
  render: ({ spec }) => drawing(<Whole spec={spec} />),
}

// Offices sized by staff: the map and the inset hold the points, the legend
// their sizes, the table one row per site.
export const Points: StoryObj = {
  render: () => drawing(<Whole spec={offices} />),
}

// The parts rearranged: the legend above the map, the value of the country
// under the pointer below it, no table, on the dark palette.
const Rearranged = () => (
  <Figure.Root drawn={useDrawn(growth)} palette={dark}>
    <Figure.Title />
    <Figure.Legend />
    <Figure.Map />
    <Figure.Details />
    <Figure.Credits />
  </Figure.Root>
)

export const Composed: StoryObj = {
  render: () => drawing(<Rearranged />),
}

// A part of your own: a ranking that shares the active country with the
// map, so pointing at either outlines both.
const Ranking = () => {
  const {
    state: { scene, palette, active },
    actions: { activate },
  } = useFigure()

  return (
    <ol className="m-0 grid list-none grid-cols-2 gap-x-6 p-0 text-sm sm:grid-cols-3">
      {scene.rows.map((row, index) => (
        <li key={row.country}>
          <button
            type="button"
            className="flex w-full justify-between gap-2 rounded-sm px-1 text-left"
            style={{ background: row.country === active ? palette.blank : "transparent" }}
            onPointerEnter={() => activate(row.country)}
            onPointerLeave={() => activate(undefined)}
            onFocus={() => activate(row.country)}
            onBlur={() => activate(undefined)}
          >
            <span>
              {index + 1}. {row.name}
            </span>
            <span className="tabular-nums">{row.value}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}

const Ranked = () => (
  <Figure.Root drawn={useDrawn(growth)}>
    <Figure.Title />
    <Figure.Map />
    <Ranking />
    <Figure.Credits />
  </Figure.Root>
)

export const Linked: StoryObj = {
  render: () => drawing(<Ranked />),
}

// What a host does with a model's tool call: parse the input, then draw it
// or hand the issues back to the model.
const FromModel = ({ input }: { readonly input: unknown }) => {
  const parsed = parse(input)

  return parsed.ok ? <Whole spec={parsed.spec} /> : <Figure.Issues issues={parsed.issues} />
}

type ModelStory = StoryObj<{ readonly input: unknown }>

const model: Pick<ModelStory, "argTypes" | "render"> = {
  argTypes: { input: { control: "object" } },
  render: ({ input }) => drawing(<FromModel input={input} />),
}

export const ModelOutput: ModelStory = {
  ...model,
  args: { input: output },
}

// Years played over a slider. Each year is a new scene; the transition
// keeps the last year on screen while the next one draws, and motion eases
// each country's fill. Fixed breaks keep the legend still from year to year.
const years = Array.from({ length: 10 }, (_, index) => 2015 + index)

const yearly = (year: number): Spec => ({
  title: `Unemployment rate, % (${year})`,
  source: "Illustrative values",
  fill: {
    kind: "choropleth",
    values: illustrative(europe, year),
    scale: { kind: "breaks", at: [4, 6, 8, 10] },
    better: "lower",
  },
})

const Eased = () => {
  const { scene, palette } = useFigure().state

  return (
    <svg
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      role="img"
      aria-label={scene.description}
      className="block h-auto w-full"
    >
      <path d={scene.land} fill={palette.land} />
      {scene.shapes.map((shape) => (
        <motion.path
          key={shape.country}
          d={shape.path}
          stroke={palette.stroke}
          strokeWidth={0.5}
          initial={false}
          animate={{ fill: paint(shape.tone, { palette }) }}
          transition={{ duration: 0.6 }}
        >
          <title>{shape.label}</title>
        </motion.path>
      ))}
    </svg>
  )
}

const OverTime = () => {
  const [year, setYear] = useState(years[0] ?? 2015)
  const [, startTransition] = useTransition()

  return (
    <MotionConfig reducedMotion="user">
      <Figure.Root drawn={useDrawn(yearly(year))}>
        <Figure.Title />
        <Eased />
        <Figure.Legend />
        <Years
          years={years}
          onYear={(index) => startTransition(() => setYear(years[index] ?? year))}
        />
        <Figure.Credits />
      </Figure.Root>
    </MotionConfig>
  )
}

export const Animated: StoryObj = {
  render: () => drawing(<OverTime />),
}

// A layout written in JSX, drawn by the same parts: the United States beside
// Western Europe, a kilometre as long in both panels.
const compared: ReadonlyArray<Country> = ["USA", "GBR", "FRA", "ESP", "DEU", "ITA"]

const Comparison = () => (
  <Figure.Root
    drawn={useDrawn({
      sheet: layout(
        <Sheet insets={false}>
          {compared.map((code) => (
            <Place key={code} code={code} />
          ))}
        </Sheet>,
      ),
      title: "GDP growth, 2024 (%)",
      source: "Illustrative values",
      fill: { kind: "choropleth", values: illustrative(compared, 3), better: "higher" },
    })}
  >
    <Figure.Title />
    <Figure.Map />
    <Figure.Details />
    <Figure.Legend />
    <Figure.Credits />
  </Figure.Root>
)

export const Layout: StoryObj = {
  render: () => drawing(<Comparison />),
}
