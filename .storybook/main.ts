import type { StorybookConfig } from "@storybook/html-vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"

// Stories are plain HTML; React and Tailwind are here only for the shadcn
// components some stories mount.
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  framework: "@storybook/html-vite",
  core: { disableTelemetry: true },
  viteFinal: (vite) => ({
    ...vite,
    plugins: [...(vite.plugins ?? []), tailwindcss(), react()],
  }),
}

export default config
