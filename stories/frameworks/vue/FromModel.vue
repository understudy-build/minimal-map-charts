<script setup lang="ts">
import { computed } from "vue"

import { parse } from "../../../src/index.ts"
import * as Figure from "./figure.ts"
import Whole from "./Whole.vue"

// What a host does with a model's tool call: parse the input, then draw it
// or hand the issues back to the model.
const props = defineProps({ input: { type: null, required: true } })
const parsed = computed(() => parse(props.input))
</script>

<template>
  <Whole v-if="parsed.ok" :spec="parsed.spec" />
  <Figure.Issues v-else :issues="parsed.issues" />
</template>
