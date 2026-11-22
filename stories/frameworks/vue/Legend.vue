<script setup lang="ts">
import { computed } from "vue"

import { entries, key, look } from "../text.ts"
import { useFigure } from "./context.ts"

// The fill's shades, then the points' legend in map units at the map's
// width, so its circles match the map's.
const { state } = useFigure()
const items = computed(() => entries(state.scene, state.palette))
const sizes = computed(() => key(state.scene))
const circle = computed(() => look(state.scene, { palette: state.palette }))
</script>

<template>
  <ul
    class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm"
    :style="{ color: state.palette.muted }"
  >
    <li
      v-for="entry in items"
      :key="entry.key"
      class="flex items-center gap-1.5"
      :style="entry.colour === undefined ? { color: state.palette.ink } : undefined"
    >
      <span
        v-if="entry.colour !== undefined"
        aria-hidden="true"
        class="size-3 rounded-xs"
        :style="{ background: entry.colour }"
      />
      {{ entry.text }}
    </li>
  </ul>
  <svg
    v-if="sizes !== undefined"
    :viewBox="`0 0 ${sizes.width} ${sizes.height}`"
    aria-hidden="true"
    class="block h-auto w-full"
  >
    <circle
      v-for="each in sizes.circles"
      :key="each.r"
      :cx="each.x"
      :cy="each.y"
      :r="each.r"
      :fill="circle.fill"
      :fill-opacity="circle.opacity"
      :stroke="circle.stroke"
    />
    <text
      v-for="text in sizes.texts"
      :key="text.text"
      :x="text.x"
      :y="text.y"
      :font-size="sizes.size"
      :fill="text.title ? state.palette.ink : state.palette.muted"
    >
      {{ text.text }}
    </text>
  </svg>
</template>
