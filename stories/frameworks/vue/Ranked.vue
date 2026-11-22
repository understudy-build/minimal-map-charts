<script setup lang="ts">
import { growth } from "../examples.ts"
import { useDrawn } from "./context.ts"
import * as Figure from "./figure.ts"
import Ranking from "./Ranking.vue"

const drawn = useDrawn(growth)
</script>

<template>
  <Figure.Root v-if="drawn?.ok" :scene="drawn.scene">
    <Figure.Title />
    <Figure.Map />
    <Ranking />
    <Figure.Credits />
  </Figure.Root>
  <Figure.Issues v-else-if="drawn !== undefined" :issues="drawn.issues" />
</template>
