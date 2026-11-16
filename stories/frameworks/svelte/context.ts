import { createContext } from "svelte"

import type { Country, Palette, Scene } from "../../../src/index.ts"

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

// `useFigure` is for parts of your own, such as a ranking linked to the map.
export const [useFigure, setFigure] = createContext<Contract>()
