<script setup lang="ts">
import { computed, type PropType } from "vue"

import type { Mark } from "../../../src/index.ts"
import { look } from "../text.ts"
import { useFigure } from "./context.ts"

// A point's circle, at `scale` map units to each of its frame's: the map's,
// or an inset's. It takes focus and reports itself as what the reader points
// at, ringed in ink while it is.
const props = defineProps({
  mark: { type: Object as PropType<Mark>, required: true },
  scale: { type: Number, default: 1 },
})
const { state, actions } = useFigure()
const drawn = computed(() => look(state.scene, { palette: state.palette, value: props.mark.value }))
const active = computed(() => state.active === props.mark)
</script>

<template>
  <circle
    :cx="mark.x"
    :cy="mark.y"
    :r="mark.radius / scale"
    :fill="drawn.fill"
    :fill-opacity="drawn.opacity"
    :stroke="active ? state.palette.ink : drawn.stroke"
    :stroke-width="(active ? 2 : 1) / scale"
    role="img"
    :aria-label="mark.label"
    tabindex="0"
    class="outline-none"
    @pointerenter="actions.activate(mark)"
    @pointerleave="actions.activate(undefined)"
    @focus="actions.activate(mark)"
    @blur="actions.activate(undefined)"
  >
    <title>{{ mark.label }}</title>
  </circle>
</template>
