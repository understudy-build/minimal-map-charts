// Builds the view into one HTML file, scripts inlined: an MCP App's resource
// is a single document, and its default CSP loads nothing from elsewhere.
import { fileURLToPath } from "node:url"

import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: { input: fileURLToPath(new URL("view.html", import.meta.url)) },
  },
})
