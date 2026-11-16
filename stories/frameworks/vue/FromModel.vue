<script setup lang="ts">
import { computed } from "vue"

import { describe, parse } from "../../../src/index.ts"
import Whole from "./Whole.vue"

// What a host does with a model's tool call: parse the input, then draw it
// or hand the issues back to the model.
const props = defineProps({ input: { type: null, required: true } })
const parsed = computed(() => parse(props.input))
</script>

<template>
  <Whole v-if="parsed.ok" :spec="parsed.spec" />
  <ul v-else role="alert" class="font-mono text-sm text-red-700">
    <li v-for="issue in parsed.issues" :key="describe(issue)">{{ describe(issue) }}</li>
  </ul>
</template>
