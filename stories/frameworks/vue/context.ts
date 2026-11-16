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

// The scene for a spec, drawn again when the spec changes. It keeps the last
// scene on screen while the next one draws, and drops a draw a newer spec
// has replaced.
export const useScene = (spec: MaybeRefOrGetter<Spec>, { locale = "en" }: DrawOptions = {}) => {
  const scene = shallowRef<Scene>()

  watchEffect((onCleanup) => {
    let live = true

    onCleanup(() => {
      live = false
    })
    void draw(toValue(spec), { locale }).then((drawn) => {
      if (live) scene.value = drawn
    })
  })

  return scene
}
