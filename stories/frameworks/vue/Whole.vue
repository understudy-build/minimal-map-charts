<script setup lang="ts">
import type { PropType } from "vue"

import type { Spec } from "../../../src/index.ts"
import { useDrawn } from "./context.ts"
import * as Figure from "./figure.ts"

// Every part in its usual order, or the areas the sheet does not draw.
const props = defineProps({ spec: { type: Object as PropType<Spec>, required: true } })
const drawn = useDrawn(() => props.spec)
</script>

<template>
  <Figure.Root v-if="drawn?.ok" :scene="drawn.scene">
    <Figure.Title />
    <Figure.Map />
    <Figure.Insets />
    <Figure.Legend />
    <Figure.Credits />
    <Figure.Table />
  </Figure.Root>
  <Figure.Issues v-else-if="drawn !== undefined" :issues="drawn.issues" />
  <p v-else class="text-sm">Drawing the map…</p>
</template>
