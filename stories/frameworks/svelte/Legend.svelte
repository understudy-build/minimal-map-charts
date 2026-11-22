<script lang="ts">
  import { entries, key, look } from "../text.ts"
  import { useFigure } from "./context.ts"

  // The fill's shades, then the points' legend in map units at the map's
  // width, so its circles match the map's.
  const { state } = useFigure()
  const sizes = $derived(key(state.scene))
  const circle = $derived(look(state.scene, { palette: state.palette }))
</script>

<ul
  class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm"
  style:color={state.palette.muted}
>
  {#each entries(state.scene, state.palette) as entry (entry.key)}
    <li
      class="flex items-center gap-1.5"
      style:color={entry.colour === undefined ? state.palette.ink : undefined}
    >
      {#if entry.colour !== undefined}
        <span aria-hidden="true" class="size-3 rounded-xs" style:background={entry.colour}></span>
      {/if}
      {entry.text}
    </li>
  {/each}
</ul>
{#if sizes !== undefined}
  <svg viewBox="0 0 {sizes.width} {sizes.height}" aria-hidden="true" class="block h-auto w-full">
    {#each sizes.circles as each (each.r)}
      <circle
        cx={each.x}
        cy={each.y}
        r={each.r}
        fill={circle.fill}
        fill-opacity={circle.opacity}
        stroke={circle.stroke}
      />
    {/each}
    {#each sizes.texts as text (text.text)}
      <text
        x={text.x}
        y={text.y}
        font-size={sizes.size}
        fill={text.title ? state.palette.ink : state.palette.muted}>{text.text}</text
      >
    {/each}
  </svg>
{/if}
