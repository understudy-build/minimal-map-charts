// The view of `show_map`: it paints the scene the server drew, in the host's
// theme, and paints it again when the theme changes. A scene holds tones,
// not colours, so a repaint needs no new call. It imports only `svg`, never
// `draw`, so the page carries no sheets.
import { App, applyDocumentTheme } from "@modelcontextprotocol/ext-apps"

import type { Scene } from "../../src/draw.ts"
import { dark, light, svg } from "../../src/svg.ts"

const root = document.querySelector("main") ?? document.body
const app = new App({ name: "Map", version: "0.0.0" })

let scene: Scene | undefined

const paint = () => {
  const theme = app.getHostContext()?.theme ?? "light"

  applyDocumentTheme(theme)

  if (scene !== undefined) root.innerHTML = svg(scene, { palette: theme === "dark" ? dark : light })
}

app.addEventListener("toolinput", () => {
  root.textContent = "Drawing the map…"
})

app.addEventListener("toolresult", (result) => {
  if (result.isError === true) {
    root.textContent = "The map could not be drawn."
    return
  }

  // The scene is this server's own result, relayed by the host, which
  // already controls this frame; the view takes it as drawn rather than
  // checking it again.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  scene = result.structuredContent as Scene | undefined
  paint()
})

app.addEventListener("hostcontextchanged", paint)

await app.connect()
paint()
