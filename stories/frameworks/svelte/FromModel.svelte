<script lang="ts">
  import { parse } from "../../../src/index.ts"
  import * as Figure from "./figure.ts"
  import Whole from "./Whole.svelte"

  // What a host does with a model's tool call: parse the input, then draw it
  // or hand the issues back to the model.
  let { input }: { input: unknown } = $props()
  const parsed = $derived(parse(input))
</script>

{#if parsed.ok}
  <Whole spec={parsed.spec} />
{:else}
  <Figure.Issues issues={parsed.issues} />
{/if}
