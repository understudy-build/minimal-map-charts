<script setup lang="ts">
import { growth } from "../examples.ts"
import { useScene } from "./context.ts"
import * as Figure from "./figure.ts"
import Ranking from "./Ranking.vue"

const scene = useScene(growth)
</script>

<template>
  <Figure.Root v-if="scene !== undefined" :scene="scene">
    <Figure.Title />
    <Figure.Map />
    <Ranking />
    <Figure.Credits />
  </Figure.Root>
</template>
