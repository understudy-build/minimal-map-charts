<script setup lang="ts">
import type { PropType } from "vue"

import type { Spec } from "../../../src/index.ts"
import { useScene } from "./context.ts"
import * as Figure from "./figure.ts"

// Every part in its usual order.
const props = defineProps({ spec: { type: Object as PropType<Spec>, required: true } })
const scene = useScene(() => props.spec)
</script>

<template>
  <Figure.Root v-if="scene !== undefined" :scene="scene">
    <Figure.Title />
    <Figure.Map />
    <Figure.Insets />
    <Figure.Legend />
    <Figure.Credits />
    <Figure.Table />
  </Figure.Root>
  <p v-else class="text-sm">Drawing the map…</p>
</template>
