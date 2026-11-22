import { createContext, type ReactNode, use, useState } from "react"

import {
  type Area,
  type Country,
  describe,
  draw,
  type Drawn,
  type DrawOptions,
  type Issue,
  light,
  type Mark,
  paint,
  type Palette,
  type Scene,
  type Spec,
} from "../../../src/index.ts"
import { credit, entries, hint, insetScale, key, look } from "../text.ts"

// A React recipe for the scene: copy it into an app. The package stays free
// of React; this file is the whole integration.

// What `draw` returns, by locale and spec: a scene, or the areas its sheet
// does not draw. `draw` is async, so `useDrawn` suspends on its promise; a
// spec drawn twice reuses the same promise, as `use` requires. It never
// evicts, which suits a page with a few maps; an app with many would.
const drawings = new Map<string, Promise<Drawn>>()

export const useDrawn = (spec: Spec, { locale = "en" }: DrawOptions = {}): Drawn => {
  const id = `${locale} ${JSON.stringify(spec)}`
  const drawn = drawings.get(id) ?? draw(spec, { locale })

  drawings.set(id, drawn)

  return use(drawn)
}

// The lines a model would read, for a spec that does not parse or draw.
const Issues = ({ issues }: { readonly issues: ReadonlyArray<Issue> }) => (
  <ul role="alert" className="font-mono text-sm text-red-700">
    {issues.map((issue) => (
      <li key={describe(issue)}>{describe(issue)}</li>
    ))}
  </ul>
)

// What the reader points at: a country, an area, or a point's mark.
type Active = Country | Area | Mark | undefined

// What every part of a figure reads: the scene, its palette and what the
// reader points at, and how to change it.
interface Contract {
  readonly state: {
    readonly scene: Scene
    readonly palette: Palette
    readonly active: Active
  }
  readonly actions: {
    readonly activate: (active: Active) => void
  }
}

const Context = createContext<Contract | undefined>(undefined)

// For parts of your own, such as a ranking linked to the map.
export const useFigure = (): Contract => {
  const contract = use(Context)

  if (contract === undefined) throw new Error("Figure parts belong inside <Figure.Root>.")

  return contract
}

interface RootProps {
  readonly drawn: Drawn
  readonly palette?: Palette
  readonly children: ReactNode
}

// The figure, or the issues when the spec does not draw.
const Root = ({ drawn, palette = light, children }: RootProps) => {
  const [active, activate] = useState<Active>()

  if (!drawn.ok) return <Issues issues={drawn.issues} />

  return (
    <Context value={{ state: { scene: drawn.scene, palette, active }, actions: { activate } }}>
      <figure
        className="m-0 flex max-w-[900px] flex-col gap-3 p-4 font-sans"
        style={{ background: palette.surface, color: palette.ink }}
      >
        {children}
      </figure>
    </Context>
  )
}

const Title = () => {
  const { scene } = useFigure().state

  return scene.title === undefined ? null : (
    <figcaption className="text-lg font-semibold">{scene.title}</figcaption>
  )
}

// The shape the reader points at: a country's, or an area's patch.
const pointed = (scene: Scene, active: Active) =>
  typeof active === "object"
    ? undefined
    : (scene.patches.find((patch) => patch.area === active) ??
      scene.shapes.find((shape) => shape.country === active))

// A point's circle, at `scale` map units to each of its frame's: the map's,
// or an inset's. It takes focus and reports itself as what the reader points
// at, ringed in ink while it is.
const Circle = ({ mark, scale = 1 }: { readonly mark: Mark; readonly scale?: number }) => {
  const {
    state: { scene, palette, active },
    actions: { activate },
  } = useFigure()
  const { fill, opacity, stroke } = look(scene, { palette, value: mark.value })

  return (
    <circle
      cx={mark.x}
      cy={mark.y}
      r={mark.radius / scale}
      fill={fill}
      fillOpacity={opacity}
      stroke={active === mark ? palette.ink : stroke}
      strokeWidth={(active === mark ? 2 : 1) / scale}
      role="img"
      aria-label={mark.label}
      tabIndex={0}
      className="outline-none"
      onPointerEnter={() => activate(mark)}
      onPointerLeave={() => activate(undefined)}
      onFocus={() => activate(mark)}
      onBlur={() => activate(undefined)}
    >
      <title>{mark.label}</title>
    </circle>
  )
}

// The map itself. Countries, areas and points take focus and report the one
// the reader points at; the active one is outlined on top.
const Shapes = () => {
  const {
    state: { scene, palette, active },
    actions: { activate },
  } = useFigure()
  const listed = new Set(scene.rows.map((row) => row.area ?? row.country))
  const outlined = pointed(scene, active)

  return (
    <svg
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      role="group"
      aria-label={scene.description}
      className="block h-auto w-full"
    >
      <path d={scene.land} fill={palette.land} />
      {scene.shapes.map((shape) => {
        const focusable = listed.has(shape.country)

        return (
          <path
            key={shape.country}
            d={shape.path}
            fill={paint(shape.tone, { palette })}
            stroke={palette.stroke}
            strokeWidth={0.5}
            role={focusable ? "img" : undefined}
            aria-label={focusable ? shape.label : undefined}
            tabIndex={focusable ? 0 : undefined}
            className="outline-none"
            onPointerEnter={() => activate(shape.country)}
            onPointerLeave={() => activate(undefined)}
            onFocus={() => activate(shape.country)}
            onBlur={() => activate(undefined)}
          >
            <title>{shape.label}</title>
          </path>
        )
      })}
      {scene.patches.map((patch) => (
        <path
          key={patch.area}
          d={patch.path}
          fill={paint(patch.tone, { palette })}
          stroke={palette.stroke}
          strokeWidth={0.5}
          role="img"
          aria-label={patch.label}
          tabIndex={0}
          className="outline-none"
          onPointerEnter={() => activate(patch.area)}
          onPointerLeave={() => activate(undefined)}
          onFocus={() => activate(patch.area)}
          onBlur={() => activate(undefined)}
        >
          <title>{patch.label}</title>
        </path>
      ))}
      {scene.borders.map((border) => (
        <path
          key={border.code}
          d={border.path}
          fill="none"
          stroke={palette.stroke}
          strokeWidth={1.5}
          pointerEvents="none"
        />
      ))}
      {outlined === undefined ? null : (
        <path
          d={outlined.path}
          fill="none"
          stroke={palette.ink}
          strokeWidth={2}
          pointerEvents="none"
        />
      )}
      {scene.marks.map((mark) => (
        <Circle key={`${mark.name} ${mark.x} ${mark.y}`} mark={mark} />
      ))}
    </svg>
  )
}

const Insets = () => {
  const { scene, palette } = useFigure().state

  return scene.insets.length === 0 ? null : (
    <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
      {scene.insets.map((inset) => (
        <li key={`${inset.country} ${inset.name}`} className="flex w-24 flex-col gap-1">
          <svg
            viewBox={`0 0 ${inset.width} ${inset.height}`}
            role="img"
            aria-label={inset.label}
            className="block h-auto w-full rounded-sm border"
            style={{ borderColor: palette.blank }}
          >
            <path
              d={inset.path}
              fill={paint(inset.tone, { palette })}
              stroke={palette.stroke}
              strokeWidth={1.5}
            />
            {inset.patches.map((patch) => (
              <path
                key={patch.area}
                d={patch.path}
                fill={paint(patch.tone, { palette })}
                stroke={palette.stroke}
                strokeWidth={1.5}
              >
                <title>{patch.label}</title>
              </path>
            ))}
            {inset.marks.map((mark) => (
              <Circle key={mark.name} mark={mark} scale={insetScale(scene, inset)} />
            ))}
          </svg>
          <span className="text-xs" style={{ color: palette.muted }}>
            {inset.name}
          </span>
        </li>
      ))}
    </ul>
  )
}

// The points' legend, in map units at the map's width, so its circles match
// the map's.
const Key = () => {
  const { scene, palette } = useFigure().state
  const drawn = key(scene)

  if (drawn === undefined) return null

  const { fill, opacity, stroke } = look(scene, { palette })

  return (
    <svg viewBox={`0 0 ${drawn.width} ${drawn.height}`} aria-hidden className="block h-auto w-full">
      {drawn.circles.map((circle) => (
        <circle
          key={circle.r}
          cx={circle.x}
          cy={circle.y}
          r={circle.r}
          fill={fill}
          fillOpacity={opacity}
          stroke={stroke}
        />
      ))}
      {drawn.texts.map((text) => (
        <text
          key={text.text}
          x={text.x}
          y={text.y}
          fontSize={drawn.size}
          fill={text.title ? palette.ink : palette.muted}
        >
          {text.text}
        </text>
      ))}
    </svg>
  )
}

// The fill's shades, then the points' legend.
const Legend = () => {
  const { scene, palette } = useFigure().state

  return (
    <>
      <ul
        className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm"
        style={{ color: palette.muted }}
      >
        {entries(scene, palette).map((entry) => (
          <li
            key={entry.key}
            className="flex items-center gap-1.5"
            style={entry.colour === undefined ? { color: palette.ink } : undefined}
          >
            {entry.colour === undefined ? null : (
              <span
                aria-hidden
                className="size-3 rounded-xs"
                style={{ background: entry.colour }}
              />
            )}
            {entry.text}
          </li>
        ))}
      </ul>
      <Key />
    </>
  )
}

// The active country's, area's or point's value, announced to screen readers
// as it changes.
const Details = () => {
  const { scene, palette, active } = useFigure().state
  const label = typeof active === "object" ? active.label : pointed(scene, active)?.label

  return (
    <output aria-live="polite" className="min-h-6 text-sm" style={{ color: palette.muted }}>
      {label ?? hint}
    </output>
  )
}

const Credits = () => {
  const { scene, palette } = useFigure().state

  return (
    <p className="m-0 text-xs" style={{ color: palette.muted }}>
      {credit(scene)}
    </p>
  )
}

const Table = () => {
  const { scene, palette } = useFigure().state

  return (
    <>
      {scene.rows.length === 0 ? null : (
        <details className="text-sm">
          <summary className="cursor-pointer" style={{ color: palette.muted }}>
            Data table
          </summary>
          <table className="mt-2 border-collapse">
            <thead>
              <tr>
                <th className="pr-6 text-left">
                  {scene.rows.some((row) => row.area !== undefined) ? "Area" : "Country"}
                </th>
                <th className="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {scene.rows.map((row) => (
                <tr key={row.area ?? row.country}>
                  <td className="pr-6">{row.name}</td>
                  <td className="text-right tabular-nums">{row.value ?? "No data"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      {scene.points === undefined ? null : (
        <details className="text-sm">
          <summary className="cursor-pointer" style={{ color: palette.muted }}>
            Points
          </summary>
          <table className="mt-2 border-collapse">
            <thead>
              <tr>
                <th className="pr-6 text-left">Site</th>
                {scene.points.kind === "bubble" ? (
                  <th className="text-right">{scene.points.label ?? "Value"}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {scene.points.sites.map((site) => (
                <tr key={site.name}>
                  <td className="pr-6">{site.name}</td>
                  {site.value === undefined ? null : (
                    <td className="text-right tabular-nums">{site.value}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  )
}

// A scene as React parts. Put them in any order, leave any out, or add parts
// of your own with `useFigure`.
export const Figure = {
  Root,
  Issues,
  Title,
  Map: Shapes,
  Insets,
  Legend,
  Details,
  Credits,
  Table,
}
