/** @jsxImportSource solid-js */
import {
  createContext,
  createResource,
  createSignal,
  For,
  type JSX,
  Show,
  useContext,
} from "solid-js"

import {
  type Country,
  describe,
  draw,
  type DrawOptions,
  type Issue,
  light,
  paint,
  type Palette,
  type Scene,
  type Spec,
} from "../../../src/index.ts"
import { credit, entries, hint } from "../text.ts"

// A Solid recipe for the scene: copy it into an app.

// What `draw` returns for a spec, a scene or the areas its sheet does not
// draw, as a resource: reading it inside <Suspense> shows the fallback until
// it is drawn, and it draws again when the spec changes.
export const useDrawn = (spec: () => Spec, { locale = "en" }: DrawOptions = {}) => {
  const [drawn] = createResource(spec, (each) => draw(each, { locale }))

  return drawn
}

// The lines a model would read, for a spec that does not parse or draw.
const Issues = (props: { readonly issues: ReadonlyArray<Issue> }) => (
  <ul role="alert" class="font-mono text-sm text-red-700">
    <For each={props.issues}>{(issue) => <li>{describe(issue)}</li>}</For>
  </ul>
)

// What every part of a figure reads: the scene, its palette and the country
// the reader points at, and how to change it.
interface Contract {
  readonly state: {
    readonly scene: Scene
    readonly palette: Palette
    readonly active: Country | undefined
  }
  readonly actions: {
    readonly activate: (country: Country | undefined) => void
  }
}

const Context = createContext<Contract>()

// For parts of your own, such as a ranking linked to the map.
export const useFigure = (): Contract => {
  const contract = useContext(Context)

  if (contract === undefined) throw new Error("Figure parts belong inside <Figure.Root>.")

  return contract
}

interface RootProps {
  readonly scene: Scene
  readonly palette?: Palette
  readonly children: JSX.Element
}

const Root = (props: RootProps) => {
  const [active, setActive] = createSignal<Country>()
  const palette = () => props.palette ?? light

  // Getters, so parts read the current props without copying the scene.
  const contract: Contract = {
    state: {
      get scene() {
        return props.scene
      },
      get palette() {
        return palette()
      },
      get active() {
        return active()
      },
    },
    actions: { activate: (country) => setActive(() => country) },
  }

  return (
    <Context.Provider value={contract}>
      <figure
        class="m-0 flex max-w-[900px] flex-col gap-3 p-4 font-sans"
        style={{ background: palette().surface, color: palette().ink }}
      >
        {props.children}
      </figure>
    </Context.Provider>
  )
}

const Title = () => {
  const { state } = useFigure()

  return (
    <Show when={state.scene.title}>
      {(title) => <figcaption class="text-lg font-semibold">{title()}</figcaption>}
    </Show>
  )
}

// The map itself. Countries in the fill take focus and report the one the
// reader points at; the active country is outlined on top.
const Shapes = () => {
  const { state, actions } = useFigure()
  const listed = () => new Set(state.scene.rows.map((row) => row.country))
  const outlined = () => state.scene.shapes.find((shape) => shape.country === state.active)

  return (
    <svg
      viewBox={`0 0 ${state.scene.width} ${state.scene.height}`}
      role="group"
      aria-label={state.scene.description}
      class="block h-auto w-full"
    >
      <path d={state.scene.land} fill={state.palette.land} />
      <For each={state.scene.shapes}>
        {(shape) => {
          const focusable = () => listed().has(shape.country)

          return (
            <path
              d={shape.path}
              fill={paint(shape.tone, { palette: state.palette })}
              stroke={state.palette.stroke}
              stroke-width="0.5"
              role={focusable() ? "img" : undefined}
              aria-label={focusable() ? shape.label : undefined}
              tabindex={focusable() ? 0 : undefined}
              class="outline-none"
              onPointerEnter={() => actions.activate(shape.country)}
              onPointerLeave={() => actions.activate(undefined)}
              onFocus={() => actions.activate(shape.country)}
              onBlur={() => actions.activate(undefined)}
            >
              <title>{shape.label}</title>
            </path>
          )
        }}
      </For>
      <For each={state.scene.borders}>
        {(border) => (
          <path
            d={border.path}
            fill="none"
            stroke={state.palette.stroke}
            stroke-width="1.5"
            pointer-events="none"
          />
        )}
      </For>
      <Show when={outlined()}>
        {(shape) => (
          <path
            d={shape().path}
            fill="none"
            stroke={state.palette.ink}
            stroke-width="2"
            pointer-events="none"
          />
        )}
      </Show>
    </svg>
  )
}

const Insets = () => {
  const { state } = useFigure()

  return (
    <Show when={state.scene.insets.length > 0}>
      <ul class="m-0 flex list-none flex-wrap gap-3 p-0">
        <For each={state.scene.insets}>
          {(inset) => (
            <li class="flex w-24 flex-col gap-1">
              <svg
                viewBox={`0 0 ${inset.width} ${inset.height}`}
                role="img"
                aria-label={inset.label}
                class="block h-auto w-full rounded-sm border"
                style={{ "border-color": state.palette.blank }}
              >
                <path
                  d={inset.path}
                  fill={paint(inset.tone, { palette: state.palette })}
                  stroke={state.palette.stroke}
                  stroke-width="1.5"
                />
              </svg>
              <span class="text-xs" style={{ color: state.palette.muted }}>
                {inset.name}
              </span>
            </li>
          )}
        </For>
      </ul>
    </Show>
  )
}

const Legend = () => {
  const { state } = useFigure()

  return (
    <ul
      class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm"
      style={{ color: state.palette.muted }}
    >
      <For each={entries(state.scene, state.palette)}>
        {(entry) => (
          <li
            class="flex items-center gap-1.5"
            style={entry.colour === undefined ? { color: state.palette.ink } : undefined}
          >
            <Show when={entry.colour}>
              {(colour) => (
                <span
                  aria-hidden="true"
                  class="size-3 rounded-xs"
                  style={{ background: colour() }}
                />
              )}
            </Show>
            {entry.text}
          </li>
        )}
      </For>
    </ul>
  )
}

// The active country's value, announced to screen readers as it changes.
const Details = () => {
  const { state } = useFigure()
  const shape = () => state.scene.shapes.find((each) => each.country === state.active)

  return (
    <output aria-live="polite" class="min-h-6 text-sm" style={{ color: state.palette.muted }}>
      {shape()?.label ?? hint}
    </output>
  )
}

const Credits = () => {
  const { state } = useFigure()

  return (
    <p class="m-0 text-xs" style={{ color: state.palette.muted }}>
      {credit(state.scene)}
    </p>
  )
}

const Table = () => {
  const { state } = useFigure()

  return (
    <Show when={state.scene.rows.length > 0}>
      <details class="text-sm">
        <summary class="cursor-pointer" style={{ color: state.palette.muted }}>
          Data table
        </summary>
        <table class="mt-2 border-collapse">
          <thead>
            <tr>
              <th class="pr-6 text-left">Country</th>
              <th class="text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            <For each={state.scene.rows}>
              {(row) => (
                <tr>
                  <td class="pr-6">{row.name}</td>
                  <td class="text-right tabular-nums">{row.value ?? "No data"}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </details>
    </Show>
  )
}

// A scene as Solid parts. Put them in any order, leave any out, or add parts
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
