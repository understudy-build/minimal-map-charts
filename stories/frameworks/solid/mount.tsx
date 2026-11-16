/** @jsxImportSource solid-js */
import type { Component } from "solid-js"
import { render } from "solid-js/web"

import { onRemove } from "../../figure.ts"

// Renders a Solid component into a node and disposes of it when Storybook
// removes the story.
export const mount = <Props extends object>(component: Component<Props>, props: Props) => {
  const host = document.createElement("div")
  const Mounted = component

  onRemove(
    host,
    render(() => <Mounted {...props} />, host),
  )

  return host
}
