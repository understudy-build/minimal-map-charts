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
{#if state.scene.points !== undefined}
  {@const points = state.scene.points}
  <details class="text-sm">
    <summary class="cursor-pointer" style:color={state.palette.muted}>Points</summary>
    <table class="mt-2 border-collapse">
      <thead>
        <tr>
          <th class="pr-6 text-left">Site</th>
          {#if points.kind === "bubble"}
            <th class="text-right">{points.label ?? "Value"}</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each points.sites as site (site.name)}
          <tr>
            <td class="pr-6">{site.name}</td>
            {#if site.value !== undefined}
              <td class="text-right tabular-nums">{site.value}</td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </details>
{/if}
