<script setup lang="ts">
import type { PropType } from "vue"

import { describe, type Issue } from "../../../src/index.ts"

// The lines a model would read, for a spec that does not parse or draw.
defineProps({ issues: { type: Array as PropType<ReadonlyArray<Issue>>, required: true } })
</script>

<template>
  <ul role="alert" class="font-mono text-sm text-red-700">
    <li v-for="issue in issues" :key="describe(issue)">{{ describe(issue) }}</li>
  </ul>
</template>
