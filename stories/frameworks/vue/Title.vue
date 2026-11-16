<script setup lang="ts">
import { useFigure } from "./context.ts"

const { state } = useFigure()
</script>

<template>
  <figcaption v-if="state.scene.title !== undefined" class="text-lg font-semibold">
    {{ state.scene.title }}
  </figcaption>
</template>
