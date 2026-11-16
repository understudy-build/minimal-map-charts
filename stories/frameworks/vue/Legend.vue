<script setup lang="ts">
import { computed } from "vue"

import { entries } from "../text.ts"
import { useFigure } from "./context.ts"

const { state } = useFigure()
const items = computed(() => entries(state.scene, state.palette))
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
</template>
