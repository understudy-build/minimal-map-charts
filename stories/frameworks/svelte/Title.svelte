<script lang="ts">
  import { useFigure } from "./context.ts"

  const { state } = useFigure()
</script>

{#if state.scene.title !== undefined}
  <!-- Root renders this inside its <figure>, which the compiler cannot see. -->
  <!-- svelte-ignore a11y_figcaption_parent -->
  <figcaption class="text-lg font-semibold">{state.scene.title}</figcaption>
{/if}
