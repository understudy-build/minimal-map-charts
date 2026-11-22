<script setup lang="ts">
import { paint } from "../../../src/index.ts"
import { insetScale } from "../text.ts"
import Circle from "./Circle.vue"
import { useFigure } from "./context.ts"

const { state } = useFigure()
</script>

<template>
  <ul v-if="state.scene.insets.length > 0" class="m-0 flex list-none flex-wrap gap-3 p-0">
    <li
      v-for="inset in state.scene.insets"
      :key="`${inset.country} ${inset.name}`"
      class="flex w-24 flex-col gap-1"
    >
      <svg
        :viewBox="`0 0 ${inset.width} ${inset.height}`"
        role="img"
        :aria-label="inset.label"
        class="block h-auto w-full rounded-sm border"
        :style="{ borderColor: state.palette.blank }"
      >
        <path
          :d="inset.path"
          :fill="paint(inset.tone, { palette: state.palette })"
          :stroke="state.palette.stroke"
          stroke-width="1.5"
        />
        <Circle
          v-for="mark in inset.marks"
          :key="mark.name"
          :mark="mark"
          :scale="insetScale(state.scene, inset)"
        />
      </svg>
      <span class="text-xs" :style="{ color: state.palette.muted }">{{ inset.name }}</span>
    </li>
  </ul>
</template>
