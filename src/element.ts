// `<map-chart>`: a map from the JSON in its `<script type="application/json">`
// child, for a page with no script of its own. Importing this module defines
// the element.
//
//   <map-chart><script type="application/json">{ "fill": … }</script></map-chart>
//
// The map follows the page's `color-scheme`. A spec that `parse` or `draw`
// refuses shows its problems in place of the map and logs them with
// `console.error`, where a host that reports console output passes them back
// to the model.
import { read, render } from "./render.ts"
import { size } from "./size.ts"

const style = `:host{display:block}svg{display:block;width:100%;height:auto}p{margin:0;font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap;color:light-dark(#b3261e,#f2b8b5)}`

export class MapChart extends HTMLElement {
  readonly #frame = document.createElement("div")
  // Each draw's number: a draw that finishes after a later one started is
  // dropped.
  #turn = 0
  readonly #changes = new MutationObserver(() => void this.#draw())

  constructor() {
    super()

    const root = this.attachShadow({ mode: "open" })

    root.innerHTML = `<style>${style}</style>`
    root.append(this.#frame)
  }

  connectedCallback() {
    // A host that streams HTML may connect the element before its JSON
    // arrives, and a page may change the JSON later: both draw again.
    this.#changes.observe(this, { childList: true, subtree: true, characterData: true })
    void this.#draw()
  }

  disconnectedCallback() {
    this.#changes.disconnect()
  }

  async #draw() {
    const turn = ++this.#turn
    const text = this.querySelector('script[type="application/json"]')?.textContent

    if (text === undefined || text === null) {
      this.#refuse([
        'map-chart: expected a <script type="application/json"> child holding the spec.',
      ])
      return
    }

    // The frame takes the map's final height before its sheet loads, so a
    // host that measures the page early measures the map.
    const spec = read(text)
    const reserved = spec.ok ? size(spec.spec) : undefined

    this.#frame.style.aspectRatio =
      reserved === undefined ? "" : `${reserved.width} / ${reserved.height}`

    const drawn = await render(text)

    if (turn !== this.#turn) return

    if (!drawn.ok) {
      this.#refuse(drawn.lines)
      return
    }

    this.#frame.style.aspectRatio = ""
    this.#frame.innerHTML = drawn.svg
  }

  #refuse(lines: ReadonlyArray<string>) {
    const text = lines.join("\n")
    const shown = document.createElement("p")

    shown.setAttribute("role", "alert")
    shown.textContent = text
    this.#frame.style.aspectRatio = ""
    this.#frame.replaceChildren(shown)
    console.error(text)
  }
}

if (customElements.get("map-chart") === undefined) customElements.define("map-chart", MapChart)

declare global {
  interface HTMLElementTagNameMap {
    "map-chart": MapChart
  }
}
