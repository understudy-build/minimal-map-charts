<script setup lang="ts">
import { type PropType, provide, shallowRef } from "vue"

import { type Country, light, type Palette, type Scene } from "../../../src/index.ts"
import { key } from "./context.ts"

const props = defineProps({
  scene: { type: Object as PropType<Scene>, required: true },
  palette: { type: Object as PropType<Palette>, default: () => light },
})

const active = shallowRef<Country>()

// Getters, so parts read the current props without copying the scene.
provide(key, {
  state: {
    get scene() {
      return props.scene
    },
    get palette() {
      return props.palette
    },
    get active() {
      return active.value
    },
  },
  actions: {
    activate: (country) => {
      active.value = country
    },
  },
})
</script>

<template>
  <figure
    class="m-0 flex max-w-[900px] flex-col gap-3 p-4 font-sans"
    :style="{ background: palette.surface, color: palette.ink }"
  >
    <slot />
  </figure>
</template>
