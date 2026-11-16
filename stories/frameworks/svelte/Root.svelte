<script lang="ts">
  import type { Snippet } from "svelte"

  import { type Country, light, type Palette, type Scene } from "../../../src/index.ts"
  import { setFigure } from "./context.ts"

  interface Props {
    scene: Scene
    palette?: Palette
    children: Snippet
  }

  let { scene, palette = light, children }: Props = $props()
  let active: Country | undefined = $state()

  // Getters, so parts read the current props without copying the scene.
  setFigure({
    state: {
      get scene() {
        return scene
      },
      get palette() {
        return palette
      },
      get active() {
        return active
      },
    },
    actions: {
      activate: (country) => {
        active = country
      },
    },
  })
</script>

<figure
  class="m-0 flex max-w-[900px] flex-col gap-3 p-4 font-sans"
  style:background={palette.surface}
  style:color={palette.ink}
>
  {@render children()}
</figure>
