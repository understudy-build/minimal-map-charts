<script setup lang="ts">
import { credit } from "../text.ts"
import { useFigure } from "./context.ts"

const { state } = useFigure()
</script>

<template>
  <p class="m-0 text-xs" :style="{ color: state.palette.muted }">{{ credit(state.scene) }}</p>
</template>
