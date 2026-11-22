<script setup lang="ts">
import { useFigure } from "./context.ts"

const { state } = useFigure()
</script>

<template>
  <details v-if="state.scene.rows.length > 0" class="text-sm">
    <summary class="cursor-pointer" :style="{ color: state.palette.muted }">Data table</summary>
    <table class="mt-2 border-collapse">
      <thead>
        <tr>
          <th class="pr-6 text-left">Country</th>
          <th class="text-right">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in state.scene.rows" :key="row.country">
          <td class="pr-6">{{ row.name }}</td>
          <td class="text-right tabular-nums">{{ row.value ?? "No data" }}</td>
        </tr>
      </tbody>
    </table>
  </details>
  <details v-if="state.scene.points !== undefined" class="text-sm">
    <summary class="cursor-pointer" :style="{ color: state.palette.muted }">Points</summary>
    <table class="mt-2 border-collapse">
      <thead>
        <tr>
          <th class="pr-6 text-left">Site</th>
          <th v-if="state.scene.points.kind === 'bubble'" class="text-right">
            {{ state.scene.points.label ?? "Value" }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="site in state.scene.points.sites" :key="site.name">
          <td class="pr-6">{{ site.name }}</td>
          <td v-if="site.value !== undefined" class="text-right tabular-nums">
            {{ site.value }}
          </td>
        </tr>
      </tbody>
    </table>
  </details>
</template>
