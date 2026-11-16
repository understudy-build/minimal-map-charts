import { type ReactNode, StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { onRemove } from "../../figure.ts"

// Storybook runs these stories as plain HTML, so each framework's examples
// mount themselves into a node. This one renders React and unmounts it when
// Storybook removes the story.
export const mount = (node: ReactNode) => {
  const host = document.createElement("div")
  const root = createRoot(host)

  root.render(<StrictMode>{node}</StrictMode>)
  onRemove(host, () => root.unmount())

  return host
}
