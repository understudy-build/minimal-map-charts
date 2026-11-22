import {
  inject,
  type InjectionKey,
  type MaybeRefOrGetter,
  shallowRef,
  toValue,
  watchEffect,
} from "vue"

import {
  type Country,
  draw,
  type Drawn,
  type DrawOptions,
  type Palette,
  type Scene,
  type Spec,
} from "../../../src/index.ts"

// What every part of a figure reads: the scene, its palette and the country
// the reader points at, and how to change it.
export interface Contract {
  readonly state: {
    readonly scene: Scene
    readonly palette: Palette
    readonly active: Country | undefined
  }
  readonly actions: {
    readonly activate: (country: Country | undefined) => void
  }
}

export const key: InjectionKey<Contract> = Symbol("figure")

// For parts of your own, such as a ranking linked to the map.
export const useFigure = (): Contract => {
  const contract = inject(key)

  if (contract === undefined) throw new Error("Figure parts belong inside <Figure.Root>.")

  return contract
}

// What `draw` returns for a spec, a scene or the areas its sheet does not
// draw, drawn again when the spec changes. It keeps the last result on
// screen while the next one draws, and drops a draw a newer spec has
// replaced.
export const useDrawn = (spec: MaybeRefOrGetter<Spec>, { locale = "en" }: DrawOptions = {}) => {
  const drawn = shallowRef<Drawn>()

  watchEffect((onCleanup) => {
    let live = true

    onCleanup(() => {
      live = false
    })
    void draw(toValue(spec), { locale }).then((result) => {
      if (live) drawn.value = result
    })
  })

  return drawn
}
