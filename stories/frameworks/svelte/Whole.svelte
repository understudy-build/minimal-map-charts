<script lang="ts">
  import { draw, type Spec } from "../../../src/index.ts"
  import * as Figure from "./figure.ts"

  // Every part in its usual order, once the scene is drawn, or the areas
  // its sheet does not draw.
  let { spec }: { spec: Spec } = $props()
</script>

{#await draw(spec)}
  <p class="text-sm">Drawing the map…</p>
{:then drawn}
  {#if drawn.ok}
    <Figure.Root scene={drawn.scene}>
      <Figure.Title />
      <Figure.Map />
      <Figure.Insets />
      <Figure.Legend />
      <Figure.Credits />
      <Figure.Table />
    </Figure.Root>
  {:else}
    <Figure.Issues issues={drawn.issues} />
  {/if}
{/await}
