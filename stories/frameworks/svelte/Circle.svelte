<script lang="ts">
  import type { Mark } from "../../../src/index.ts"
  import { look } from "../text.ts"
  import { useFigure } from "./context.ts"

  // A point's circle, at `scale` map units to each of its frame's: the
  // map's, or an inset's. It takes focus and reports itself as what the
  // reader points at, ringed in ink while it is.
  let { mark, scale = 1 }: { mark: Mark; scale?: number } = $props()

  const { state, actions } = useFigure()
  const drawn = $derived(look(state.scene, { palette: state.palette, value: mark.value }))
  const active = $derived(state.active === mark)
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<circle
  cx={mark.x}
  cy={mark.y}
  r={mark.radius / scale}
  fill={drawn.fill}
  fill-opacity={drawn.opacity}
  stroke={active ? state.palette.ink : drawn.stroke}
  stroke-width={(active ? 2 : 1) / scale}
  role="img"
  aria-label={mark.label}
  tabindex="0"
  class="outline-none"
  onpointerenter={() => actions.activate(mark)}
  onpointerleave={() => actions.activate(undefined)}
  onfocus={() => actions.activate(mark)}
  onblur={() => actions.activate(undefined)}
>
  <title>{mark.label}</title>
</circle>
