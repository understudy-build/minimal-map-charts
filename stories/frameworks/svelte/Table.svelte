<script lang="ts">
  import { useFigure } from "./context.ts"

  const { state } = useFigure()
</script>

{#if state.scene.rows.length > 0}
  <details class="text-sm">
    <summary class="cursor-pointer" style:color={state.palette.muted}>Data table</summary>
    <table class="mt-2 border-collapse">
      <thead>
        <tr>
          <th class="pr-6 text-left">Country</th>
          <th class="text-right">Value</th>
        </tr>
      </thead>
      <tbody>
        {#each state.scene.rows as row (row.country)}
          <tr>
            <td class="pr-6">{row.name}</td>
            <td class="text-right tabular-nums">{row.value ?? "No data"}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </details>
{/if}
