<script lang="ts">
  import { draw, type Spec } from "../../../src/index.ts"
  import * as Figure from "./figure.ts"

  // Every part in its usual order, once the scene is drawn.
  let { spec }: { spec: Spec } = $props()
</script>

{#await draw(spec)}
  <p class="text-sm">Drawing the map…</p>
{:then scene}
  <Figure.Root {scene}>
    <Figure.Title />
    <Figure.Map />
    <Figure.Insets />
    <Figure.Legend />
    <Figure.Credits />
    <Figure.Table />
  </Figure.Root>
{/await}
