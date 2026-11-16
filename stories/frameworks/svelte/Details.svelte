<script lang="ts">
  import { hint } from "../text.ts"
  import { useFigure } from "./context.ts"

  // The active country's value, announced to screen readers as it changes.
  const { state } = useFigure()
  const shape = $derived(state.scene.shapes.find((each) => each.country === state.active))
</script>

<output aria-live="polite" class="min-h-6 text-sm" style:color={state.palette.muted}>
  {shape === undefined ? hint : shape.label}
</output>
