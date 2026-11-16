<script lang="ts">
  import { useFigure } from "./context.ts"

  // A part of your own: a ranking that shares the active country with the
  // map, so pointing at either outlines both.
  const { state, actions } = useFigure()
</script>

<ol class="m-0 grid list-none grid-cols-2 gap-x-6 p-0 text-sm sm:grid-cols-3">
  {#each state.scene.rows as row, index (row.country)}
    <li>
      <button
        type="button"
        class="flex w-full justify-between gap-2 rounded-sm px-1 text-left"
        style:background={row.country === state.active ? state.palette.blank : "transparent"}
        onpointerenter={() => actions.activate(row.country)}
        onpointerleave={() => actions.activate(undefined)}
        onfocus={() => actions.activate(row.country)}
        onblur={() => actions.activate(undefined)}
      >
        <span>{index + 1}. {row.name}</span>
        <span class="tabular-nums">{row.value}</span>
      </button>
    </li>
  {/each}
</ol>
