/** @jsxImportSource solid-js */
import { createMemo, For, Show, Suspense } from "solid-js"

import { describe, parse, type Spec } from "../../../src/index.ts"
import { growth } from "../examples.ts"
import { Figure, useFigure, useScene } from "./figure.tsx"

const drawing = <p class="text-sm">Drawing the map…</p>

// Every part in its usual order, once the scene is drawn.
export const Whole = (props: { readonly spec: Spec }) => {
  const scene = useScene(() => props.spec)

  return (
    <Suspense fallback={drawing}>
      <Show when={scene()}>
        {(drawn) => (
          <Figure.Root scene={drawn()}>
            <Figure.Title />
            <Figure.Map />
            <Figure.Insets />
            <Figure.Legend />
            <Figure.Credits />
            <Figure.Table />
          </Figure.Root>
        )}
      </Show>
    </Suspense>
  )
}

// A part of your own: a ranking that shares the active country with the
// map, so pointing at either outlines both.
const Ranking = () => {
  const { state, actions } = useFigure()

  return (
    <ol class="m-0 grid list-none grid-cols-2 gap-x-6 p-0 text-sm sm:grid-cols-3">
      <For each={state.scene.rows}>
        {(row, index) => (
          <li>
            <button
              type="button"
              class="flex w-full justify-between gap-2 rounded-sm px-1 text-left"
              style={{
                background: row.country === state.active ? state.palette.blank : "transparent",
              }}
              onPointerEnter={() => actions.activate(row.country)}
              onPointerLeave={() => actions.activate(undefined)}
              onFocus={() => actions.activate(row.country)}
              onBlur={() => actions.activate(undefined)}
            >
              <span>
                {index() + 1}. {row.name}
              </span>
              <span class="tabular-nums">{row.value}</span>
            </button>
          </li>
        )}
      </For>
    </ol>
  )
}

export const Ranked = () => {
  const scene = useScene(() => growth)

  return (
    <Suspense fallback={drawing}>
      <Show when={scene()}>
        {(drawn) => (
          <Figure.Root scene={drawn()}>
            <Figure.Title />
            <Figure.Map />
            <Ranking />
            <Figure.Credits />
          </Figure.Root>
        )}
      </Show>
    </Suspense>
  )
}

// What a host does with a model's tool call: parse the input, then draw it
// or hand the issues back to the model.
export const FromModel = (props: { readonly input: unknown }) => {
  const parsed = createMemo(() => parse(props.input))
  const spec = () => {
    const result = parsed()

    return result.ok ? result.spec : undefined
  }
  const issues = () => {
    const result = parsed()

    return result.ok ? [] : result.issues.map(describe)
  }

  return (
    <Show
      when={spec()}
      fallback={
        <ul role="alert" class="font-mono text-sm text-red-700">
          <For each={issues()}>{(line) => <li>{line}</li>}</For>
        </ul>
      }
    >
      {(each) => <Whole spec={each()} />}
    </Show>
  )
}
