<script setup lang="ts">
import { computed } from "vue"

import { paint } from "../../../src/index.ts"
import { useFigure } from "./context.ts"

// The map itself. Countries in the fill take focus and report the one the
// reader points at; the active country is outlined on top.
const { state, actions } = useFigure()
const classes = computed(() => state.scene.legend?.classes ?? 1)
const listed = computed(() => new Set(state.scene.rows.map((row) => row.country)))
const outlined = computed(() => state.scene.shapes.find((shape) => shape.country === state.active))
</script>

<template>
  <svg
    :viewBox="`0 0 ${state.scene.width} ${state.scene.height}`"
    role="group"
    :aria-label="state.scene.description"
    class="block h-auto w-full"
  >
    <path :d="state.scene.land" :fill="state.palette.land" />
    <path
      v-for="shape in state.scene.shapes"
      :key="shape.country"
      :d="shape.path"
      :fill="paint(shape.tone, { classes, palette: state.palette })"
      :stroke="state.palette.stroke"
      stroke-width="0.5"
      :role="listed.has(shape.country) ? 'img' : undefined"
      :aria-label="listed.has(shape.country) ? shape.label : undefined"
      :tabindex="listed.has(shape.country) ? 0 : undefined"
      class="outline-none"
      @pointerenter="actions.activate(shape.country)"
      @pointerleave="actions.activate(undefined)"
      @focus="actions.activate(shape.country)"
      @blur="actions.activate(undefined)"
    >
      <title>{{ shape.label }}</title>
    </path>
    <path
      v-for="border in state.scene.borders"
      :key="border.code"
      :d="border.path"
      fill="none"
      :stroke="state.palette.stroke"
      stroke-width="1.5"
      pointer-events="none"
    />
    <path
      v-if="outlined !== undefined"
      :d="outlined.path"
      fill="none"
      :stroke="state.palette.ink"
      stroke-width="2"
      pointer-events="none"
    />
  </svg>
</template>
