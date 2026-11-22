import { createContext, type ReactNode, use, useState } from "react"

import {
  type Area,
  type Country,
  draw,
  type DrawOptions,
  light,
  paint,
  type Palette,
  type Scene,
  type Spec,
} from "../../../src/index.ts"
import { credit, entries, hint } from "../text.ts"

// A React recipe for the scene: copy it into an app. The package stays free
// of React; this file is the whole integration.

// Scenes by locale and spec. `draw` is async, so `useScene` suspends on its
// promise; a spec drawn twice reuses the same promise, as `use` requires. It
// never evicts, which suits a page with a few maps; an app with many would.
const scenes = new Map<string, Promise<Scene>>()

export const useScene = (spec: Spec, { locale = "en" }: DrawOptions = {}): Scene => {
  const key = `${locale} ${JSON.stringify(spec)}`
  const scene = scenes.get(key) ?? draw(spec, { locale })

  scenes.set(key, scene)

  return use(scene)
}

// What every part of a figure reads: the scene, its palette and the country
// or area the reader points at, and how to change it.
interface Contract {
  readonly state: {
    readonly scene: Scene
    readonly palette: Palette
    readonly active: Country | Area | undefined
  }
  readonly actions: {
    readonly activate: (code: Country | Area | undefined) => void
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
  readonly scene: Scene
  readonly palette?: Palette
  readonly children: ReactNode
}

const Root = ({ scene, palette = light, children }: RootProps) => {
  const [active, activate] = useState<Country | Area>()

  return (
    <Context value={{ state: { scene, palette, active }, actions: { activate } }}>
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

// What the reader points at: a country's shape, or an area's patch.
const pointed = (scene: Scene, active: Country | Area | undefined) =>
  scene.patches.find((patch) => patch.area === active) ??
  scene.shapes.find((shape) => shape.country === active)

// The map itself. Countries and areas in the fill take focus and report the
// one the reader points at; the active one is outlined on top.
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
          </svg>
          <span className="text-xs" style={{ color: palette.muted }}>
            {inset.name}
          </span>
        </li>
      ))}
    </ul>
  )
}

const Legend = () => {
  const { scene, palette } = useFigure().state

  return (
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
            <span aria-hidden className="size-3 rounded-xs" style={{ background: entry.colour }} />
          )}
          {entry.text}
        </li>
      ))}
    </ul>
  )
}

// The active country's or area's value, announced to screen readers as it
// changes.
const Details = () => {
  const { scene, palette, active } = useFigure().state
  const shape = pointed(scene, active)

  return (
    <output aria-live="polite" className="min-h-6 text-sm" style={{ color: palette.muted }}>
      {shape === undefined ? hint : shape.label}
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

  return scene.rows.length === 0 ? null : (
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
  )
}

// A scene as React parts. Put them in any order, leave any out, or add parts
// of your own with `useFigure`.
export const Figure = {
  Root,
  Title,
  Map: Shapes,
  Insets,
  Legend,
  Details,
  Credits,
  Table,
}
