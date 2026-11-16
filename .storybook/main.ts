import type { StorybookConfig } from "@storybook/html-vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import vue from "@vitejs/plugin-vue"
import solid from "vite-plugin-solid"

// Solid compiles its own JSX; React takes every other .tsx file.
const solidFiles = /stories\/frameworks\/solid\/.*\.tsx$/

// Stories are plain HTML, so each framework's examples mount themselves into
// a node: React, Vue, Svelte and Solid side by side, as the shadcn controls
// do.
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  framework: "@storybook/html-vite",
  core: { disableTelemetry: true },
  viteFinal: (vite) => ({
    ...vite,
    plugins: [
      ...(vite.plugins ?? []),
      tailwindcss(),
      react({ exclude: solidFiles }),
      solid({ include: solidFiles }),
      vue(),
      svelte(),
    ],
  }),
}

export default config
