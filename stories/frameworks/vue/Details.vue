<script setup lang="ts">
import { computed } from "vue"

import { hint } from "../text.ts"
import { useFigure } from "./context.ts"

// The active country's or point's value, announced to screen readers as it
// changes.
const { state } = useFigure()
const label = computed(() =>
  typeof state.active === "object"
    ? state.active.label
    : state.scene.shapes.find((each) => each.country === state.active)?.label,
)
</script>

<template>
  <output aria-live="polite" class="min-h-6 text-sm" :style="{ color: state.palette.muted }">
    {{ label ?? hint }}
  </output>
</template>
