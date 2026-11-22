<script lang="ts">
  import { paint } from "../../../src/index.ts"
  import Circle from "./Circle.svelte"
  import { useFigure } from "./context.ts"

  // The map itself. Countries in the fill and points take focus and report
  // the one the reader points at; the active one is outlined on top.
  const { state, actions } = useFigure()
  const listed = $derived(new Set(state.scene.rows.map((row) => row.country)))
  const outlined = $derived(state.scene.shapes.find((shape) => shape.country === state.active))
</script>

<svg
  viewBox="0 0 {state.scene.width} {state.scene.height}"
  role="group"
  aria-label={state.scene.description}
  class="block h-auto w-full"
>
  <path d={state.scene.land} fill={state.palette.land} />
  {#each state.scene.shapes as shape (shape.country)}
    {@const focusable = listed.has(shape.country)}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <path
      d={shape.path}
      fill={paint(shape.tone, { palette: state.palette })}
      stroke={state.palette.stroke}
      stroke-width="0.5"
      role={focusable ? "img" : undefined}
      aria-label={focusable ? shape.label : undefined}
      tabindex={focusable ? 0 : undefined}
      class="outline-none"
      onpointerenter={() => actions.activate(shape.country)}
      onpointerleave={() => actions.activate(undefined)}
      onfocus={() => actions.activate(shape.country)}
      onblur={() => actions.activate(undefined)}
    >
      <title>{shape.label}</title>
    </path>
  {/each}
  {#each state.scene.borders as border (border.code)}
    <path
      d={border.path}
      fill="none"
      stroke={state.palette.stroke}
      stroke-width="1.5"
      pointer-events="none"
    />
  {/each}
  {#if outlined !== undefined}
    <path
      d={outlined.path}
      fill="none"
      stroke={state.palette.ink}
      stroke-width="2"
      pointer-events="none"
    />
  {/if}
  {#each state.scene.marks as mark (`${mark.name} ${mark.x} ${mark.y}`)}
    <Circle {mark} />
  {/each}
</svg>
