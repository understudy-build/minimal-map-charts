<script lang="ts">
  import { describe, type Issue } from "../../../src/index.ts"

  // The lines a model would read, for a spec that does not parse or draw.
  let { issues }: { issues: ReadonlyArray<Issue> } = $props()
</script>

<ul role="alert" class="font-mono text-sm text-red-700">
  {#each issues as issue (describe(issue))}
    <li>{describe(issue)}</li>
  {/each}
</ul>
