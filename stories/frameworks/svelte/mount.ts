import { mount as attach, type Component, unmount } from "svelte"

import { onRemove } from "../../figure.ts"

// Mounts a Svelte component into a node and unmounts it when Storybook
// removes the story.
export const mount = (
  component: Component<Record<string, unknown>>,
  props: Record<string, unknown> = {},
) => {
  const host = document.createElement("div")
  const app = attach(component, { target: host, props })

  onRemove(host, () => void unmount(app))

  return host
}
