<script lang="ts">
  import { draw } from "../../../src/index.ts"
  import { growth } from "../examples.ts"
  import * as Figure from "./figure.ts"
  import Ranking from "./Ranking.svelte"
</script>

{#await draw(growth) then drawn}
  {#if drawn.ok}
    <Figure.Root scene={drawn.scene}>
      <Figure.Title />
      <Figure.Map />
      <Ranking />
      <Figure.Credits />
    </Figure.Root>
  {:else}
    <Figure.Issues issues={drawn.issues} />
  {/if}
{/await}
