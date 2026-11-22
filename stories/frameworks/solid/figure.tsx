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
  type Mark,
  paint,
  type Palette,
  type Scene,
  type Spec,
} from "../../../src/index.ts"
import { credit, entries, hint, insetScale, key, look } from "../text.ts"

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

// What the reader points at: a country, or a point's mark.
type Active = Country | Mark | undefined

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
  const [active, setActive] = createSignal<Active>()
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
    actions: { activate: (each) => setActive(() => each) },
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

// A point's circle, at `scale` map units to each of its frame's: the map's,
// or an inset's. It takes focus and reports itself as what the reader points
// at, ringed in ink while it is.
const Circle = (props: { readonly mark: Mark; readonly scale?: number }) => {
  const { state, actions } = useFigure()
  const scale = () => props.scale ?? 1
  const drawn = () => look(state.scene, { palette: state.palette, value: props.mark.value })
  const active = () => state.active === props.mark

  return (
    <circle
      cx={props.mark.x}
      cy={props.mark.y}
      r={props.mark.radius / scale()}
      fill={drawn().fill}
      fill-opacity={drawn().opacity}
      stroke={active() ? state.palette.ink : drawn().stroke}
      stroke-width={(active() ? 2 : 1) / scale()}
      role="img"
      aria-label={props.mark.label}
      tabindex={0}
      class="outline-none"
      onPointerEnter={() => actions.activate(props.mark)}
      onPointerLeave={() => actions.activate(undefined)}
      onFocus={() => actions.activate(props.mark)}
      onBlur={() => actions.activate(undefined)}
    >
      <title>{props.mark.label}</title>
    </circle>
  )
}

// The map itself. Countries in the fill and points take focus and report the
// one the reader points at; the active one is outlined on top.
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
      <For each={state.scene.marks}>{(mark) => <Circle mark={mark} />}</For>
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
                <For each={inset.marks}>
                  {(mark) => <Circle mark={mark} scale={insetScale(state.scene, inset)} />}
                </For>
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

// The points' legend, in map units at the map's width, so its circles match
// the map's.
const Key = () => {
  const { state } = useFigure()
  const circle = () => look(state.scene, { palette: state.palette })

  return (
    <Show when={key(state.scene)}>
      {(drawn) => (
        <svg
          viewBox={`0 0 ${drawn().width} ${drawn().height}`}
          aria-hidden="true"
          class="block h-auto w-full"
        >
          <For each={drawn().circles}>
            {(each) => (
              <circle
                cx={each.x}
                cy={each.y}
                r={each.r}
                fill={circle().fill}
                fill-opacity={circle().opacity}
                stroke={circle().stroke}
              />
            )}
          </For>
          <For each={drawn().texts}>
            {(text) => (
              <text
                x={text.x}
                y={text.y}
                font-size={String(drawn().size)}
                fill={text.title ? state.palette.ink : state.palette.muted}
              >
                {text.text}
              </text>
            )}
          </For>
        </svg>
      )}
    </Show>
  )
}

// The fill's shades, then the points' legend.
const Legend = () => {
  const { state } = useFigure()

  return (
    <>
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
      <Key />
    </>
  )
}

// The active country's or point's value, announced to screen readers as it
// changes.
const Details = () => {
  const { state } = useFigure()
  const label = () => {
    const { active } = state

    return typeof active === "object"
      ? active.label
      : state.scene.shapes.find((each) => each.country === active)?.label
  }

  return (
    <output aria-live="polite" class="min-h-6 text-sm" style={{ color: state.palette.muted }}>
      {label() ?? hint}
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
    <>
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
      <Show when={state.scene.points}>
        {(points) => (
          <details class="text-sm">
            <summary class="cursor-pointer" style={{ color: state.palette.muted }}>
              Points
            </summary>
            <table class="mt-2 border-collapse">
              <thead>
                <tr>
                  <th class="pr-6 text-left">Site</th>
                  <Show when={points().kind === "bubble"}>
                    <th class="text-right">{points().label ?? "Value"}</th>
                  </Show>
                </tr>
              </thead>
              <tbody>
                <For each={points().sites}>
                  {(site) => (
                    <tr>
                      <td class="pr-6">{site.name}</td>
                      <Show when={site.value !== undefined}>
                        <td class="text-right tabular-nums">{site.value}</td>
                      </Show>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </details>
        )}
      </Show>
    </>
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
