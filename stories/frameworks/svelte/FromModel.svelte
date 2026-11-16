<script lang="ts">
  import { describe, parse } from "../../../src/index.ts"
  import Whole from "./Whole.svelte"

  // What a host does with a model's tool call: parse the input, then draw it
  // or hand the issues back to the model.
  let { input }: { input: unknown } = $props()
  const parsed = $derived(parse(input))
</script>

{#if parsed.ok}
  <Whole spec={parsed.spec} />
{:else}
  <ul role="alert" class="font-mono text-sm text-red-700">
    {#each parsed.issues as issue (describe(issue))}
      <li>{describe(issue)}</li>
    {/each}
  </ul>
{/if}
