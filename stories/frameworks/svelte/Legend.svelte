<script lang="ts">
  import { entries } from "../text.ts"
  import { useFigure } from "./context.ts"

  const { state } = useFigure()
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
