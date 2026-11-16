<script lang="ts">
  import { paint } from "../../../src/index.ts"
  import { useFigure } from "./context.ts"

  const { state } = useFigure()
  const classes = $derived(state.scene.legend?.classes ?? 1)
</script>

{#if state.scene.insets.length > 0}
  <ul class="m-0 flex list-none flex-wrap gap-3 p-0">
    {#each state.scene.insets as inset (`${inset.country} ${inset.name}`)}
      <li class="flex w-24 flex-col gap-1">
        <svg
          viewBox="0 0 {inset.width} {inset.height}"
          role="img"
          aria-label={inset.label}
          class="block h-auto w-full rounded-sm border"
          style:border-color={state.palette.blank}
        >
          <path
            d={inset.path}
            fill={paint(inset.tone, { classes, palette: state.palette })}
            stroke={state.palette.stroke}
            stroke-width="1.5"
          />
        </svg>
        <span class="text-xs" style:color={state.palette.muted}>{inset.name}</span>
      </li>
    {/each}
  </ul>
{/if}
