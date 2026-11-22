import { createContext } from "svelte"

import type { Country, Mark, Palette, Scene } from "../../../src/index.ts"

// What the reader points at: a country, or a point's mark.
export type Active = Country | Mark | undefined

// What every part of a figure reads: the scene, its palette and what the
// reader points at, and how to change it.
export interface Contract {
  readonly state: {
    readonly scene: Scene
    readonly palette: Palette
    readonly active: Active
  }
  readonly actions: {
    readonly activate: (active: Active) => void
  }
}

// `useFigure` is for parts of your own, such as a ranking linked to the map.
export const [useFigure, setFigure] = createContext<Contract>()
