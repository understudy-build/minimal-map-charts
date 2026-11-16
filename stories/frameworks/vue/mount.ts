import { type Component, createApp } from "vue"

import { onRemove } from "../../figure.ts"

// Mounts a Vue component into a node and unmounts it when Storybook removes
// the story.
export const mount = (component: Component, props: Readonly<Record<string, unknown>> = {}) => {
  const host = document.createElement("div")
  const app = createApp(component, props)

  app.mount(host)
  onRemove(host, () => app.unmount())

  return host
}
