import type { Meta, StoryObj } from "@storybook/html-vite"
import { animate, hover, motionValue, stagger } from "motion"

import {
  countries,
  type Country,
  draw,
  light,
  paint,
  regions,
  type Scene,
  type Spec,
} from "../src/index.ts"
import { bare, credits, figure, illustrative, legend, onRemove } from "./figure.ts"
import { mountYears } from "./years.tsx"

// Every animation here respects the reader's reduced-motion setting.
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
const duration = (seconds: number) => (reduced() ? 0 : seconds)

const europe = regions.find((region) => region.id === "europe")?.countries ?? []

const shapes = (root: Element) => [...root.querySelectorAll<SVGPathElement>("path[data-country]")]

const fillOf = (scene: Scene) => {
  const classes = scene.legend?.classes ?? 1
  const colours = new Map<string, string>()

  for (const shape of scene.shapes) colours.set(shape.country, paint(shape.tone, { classes }))
  for (const inset of scene.insets) colours.set(inset.country, paint(inset.tone, { classes }))

  return colours
}

const meta = {
  title: "Maps/Motion",
  parameters: {
    docs: { description: { component: "Animations built on the scene with motion." } },
  },
} satisfies Meta

export default meta

// Countries fade in from the lowest value to the highest, so the reader sees
// the ranking build up.
export const Reveal: StoryObj = {
  loaders: [
    async () => ({
      scene: await draw({
        title: "Renewable share of electricity, %",
        source: "Illustrative values",
        fill: { kind: "choropleth", values: illustrative(europe, 7), better: "higher" },
      }),
    }),
  ],
  render: (_, { loaded }) => figure(loaded["scene"]),
  play: ({ canvasElement, loaded }) => {
    const scene: Scene = loaded["scene"]
    const order = new Map<string, number>(
      scene.shapes
        .toSorted((left, right) => (left.value ?? -1) - (right.value ?? -1))
        .map((shape, index) => [shape.country, index]),
    )

    const paths = shapes(canvasElement).toSorted(
      (left, right) =>
        (order.get(left.dataset["country"] ?? "") ?? 0) -
        (order.get(right.dataset["country"] ?? "") ?? 0),
    )

    animate(paths, { opacity: [0, 1] }, { duration: duration(0.4), delay: stagger(duration(0.04)) })
  },
}

const years = Array.from({ length: 10 }, (_, index) => 2015 + index)

const yearSpec = (year: number): Spec => ({
  title: `Unemployment rate, % (${year})`,
  source: "Illustrative values",
  fill: {
    kind: "choropleth",
    values: illustrative(europe, year - 2015),
    // Fixed breaks, so a shade means the same values every year.
    scale: { kind: "breaks", at: [3, 5, 7, 9] },
    better: "lower",
  },
})

// Each year's scene shares the sheet, so moving between years only animates
// fills. The breaks stay fixed, so a darker shade means a higher value.
export const OverTime: StoryObj = {
  loaders: [async () => ({ scenes: await Promise.all(years.map((year) => draw(yearSpec(year)))) })],
  render: (_, { loaded }) => {
    const scenes: ReadonlyArray<Scene> = loaded["scenes"]
    const first = scenes[0]

    if (first === undefined) return document.createElement("div")

    const root = document.createElement("div")
    const map = figure(first)
    const title = map.querySelector("svg > text")
    const controls = document.createElement("div")

    controls.style.margin = "8px 0"
    root.append(controls, map)

    const show = (index: number) => {
      const scene = scenes[index]

      if (scene === undefined) return

      const colours = fillOf(scene)

      for (const path of shapes(map))
        animate(
          path,
          { fill: colours.get(path.dataset["country"] ?? "") ?? light.blank },
          { duration: duration(0.6) },
        )

      for (const shape of scene.shapes)
        map
          .querySelector(`path[data-country="${shape.country}"] > title`)
          ?.replaceChildren(shape.label)

      if (title !== null) title.textContent = scene.title ?? ""
    }

    // The shadcn slider and button, mounted as a React island.
    onRemove(root, mountYears(controls, { years, onYear: show }))

    return root
  },
}

// A tour: one country at a time is picked out, the previous one fades back.
export const Tour: StoryObj = {
  loaders: [
    async () => ({ scene: await draw({ fill: { kind: "highlight", countries: ["FRA"] } }) }),
  ],
  render: (_, { loaded }) => {
    const scene: Scene = loaded["scene"]
    const stops: ReadonlyArray<Country> = ["FRA", "DEU", "POL", "ITA", "ESP", "SWE", "GRC"]
    const map = figure(scene)
    const caption = document.createElement("p")
    let index = 0

    caption.setAttribute("aria-live", "polite")
    map.prepend(caption)

    const visit = () => {
      const country = stops[index % stops.length]
      const name = scene.shapes.find((shape) => shape.country === country)?.name ?? ""

      for (const path of shapes(map)) {
        const here = path.dataset["country"] === country

        animate(
          path,
          { fill: here ? light.accent : light.blank },
          { duration: duration(0.5), ease: "easeInOut" },
        )
      }

      caption.textContent = `Now showing ${name}`
      index += 1
    }

    visit()
    const timer = setInterval(visit, 1600)

    onRemove(map, () => clearInterval(timer))

    return map
  },
}

// Hover lifts a country: its border thickens and a tooltip follows the
// pointer. Keyboard users get the same label through each path's title.
export const HoverDetails: StoryObj = {
  loaders: [
    async () => ({
      scene: await draw({
        title: "Life expectancy, years",
        source: "Illustrative values",
        fill: {
          kind: "choropleth",
          values: Object.fromEntries(
            Object.entries(illustrative(europe, 11)).map(([code, value]) => [code, 70 + value]),
          ),
          better: "higher",
        },
      }),
    }),
  ],
  render: (_, { loaded }) => {
    const scene: Scene = loaded["scene"]
    const map = figure(scene)
    const tip = document.createElement("div")

    map.style.position = "relative"
    tip.style.cssText =
      "position:absolute;pointer-events:none;padding:4px 8px;border-radius:4px;background:#0b0b0b;color:#fcfcfb;font-size:13px;opacity:0"
    map.append(tip)

    const labels = new Map<string, string>(
      scene.shapes.map((shape) => [shape.country, shape.label]),
    )

    for (const path of shapes(map)) {
      hover(path, (element, start) => {
        element.parentNode?.append(element)
        tip.textContent = labels.get(path.dataset["country"] ?? "") ?? ""
        animate(path, { strokeWidth: 3 }, { duration: duration(0.15) })
        animate(tip, { opacity: 1 }, { duration: duration(0.15) })

        const follow = (event: PointerEvent) => {
          const box = map.getBoundingClientRect()

          tip.style.left = `${event.clientX - box.left + 12}px`
          tip.style.top = `${event.clientY - box.top + 12}px`
        }

        follow(start)
        path.addEventListener("pointermove", follow)

        return () => {
          path.removeEventListener("pointermove", follow)
          animate(path, { strokeWidth: 0.5 }, { duration: duration(0.2) })
          animate(tip, { opacity: 0 }, { duration: duration(0.2) })
        }
      })
    }

    return map
  },
}

// The spec a model streams, written key by key in schema order: title and
// source, then how to colour, then the values. With the scale before the
// values, a country keeps its shade as the rest arrive.
const streamedFill = {
  kind: "choropleth",
  scale: { kind: "breaks", at: [4, 6, 8, 10] },
  better: "lower",
  values: illustrative(europe, 5),
} as const

// The partial objects a structured-output stream yields, one per step.
const partials: ReadonlyArray<Spec> = [
  { title: "Unemployment rate, %" },
  { title: "Unemployment rate, %", source: "Illustrative values" },
  ...Object.entries(streamedFill.values).map((_, index): Spec => ({
    title: "Unemployment rate, %",
    source: "Illustrative values",
    fill: {
      ...streamedFill,
      values: Object.fromEntries(Object.entries(streamedFill.values).slice(0, index + 1)),
    },
  })),
]

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, reduced() ? 0 : milliseconds))

// A map drawn while a model writes its spec. The host waits for the first
// country before drawing: the frame depends on the countries, and drawing the
// world first would only swap it out. From then on each value colours its
// country as it arrives. A later country outside Europe would widen the frame;
// a host that needs a stable frame asks the model to write `sheet` first.
export const StreamingFromAModel: StoryObj = {
  render: () => {
    const root = document.createElement("div")
    const output = document.createElement("pre")
    const panel = document.createElement("div")
    const title = document.createElement("h3")
    const stage = document.createElement("div")
    const replay = document.createElement("button")
    let run = 0

    root.style.cssText =
      "display:grid;grid-template-columns:minmax(220px,1fr) 2fr;gap:16px;font-family:system-ui,sans-serif;max-width:1100px"
    output.style.cssText =
      "margin:0;padding:12px;background:#f0efec;border-radius:6px;font-size:12px;max-height:640px;overflow:auto"
    output.setAttribute("aria-label", "The spec as the model writes it")
    title.style.margin = "0 0 8px"
    stage.style.cssText = "min-height:420px;display:grid;place-items:center;color:#52514e"
    replay.textContent = "Replay"
    panel.append(replay, title, stage)
    root.append(output, panel)

    const play = async () => {
      run += 1

      const mine = run
      let map: SVGSVGElement | undefined
      let sheet: Scene["sheet"] | undefined
      const colours = new Map<string, string>()

      stage.replaceChildren("Waiting for the first country…")
      title.textContent = ""

      for (const partial of partials) {
        if (mine !== run || !root.isConnected) return

        output.textContent = JSON.stringify(partial, null, 2)
        title.textContent = partial.title ?? ""

        const named = partial.fill?.kind === "choropleth" ? Object.keys(partial.fill.values) : []

        if (named.length > 0) {
          // Each step waits for its draw, so the stream applies in order.
          // oxlint-disable-next-line no-await-in-loop
          const scene = await draw(partial)

          if (map === undefined || scene.sheet !== sheet) {
            map = bare(scene)
            sheet = scene.sheet
            colours.clear()

            for (const path of shapes(map)) colours.set(path.dataset["country"] ?? "", light.blank)
            for (const path of shapes(map)) path.setAttribute("fill", light.blank)

            stage.replaceChildren(map, legend(scene), credits(scene))
            animate(map, { opacity: [0, 1] }, { duration: duration(0.4) })
          } else {
            stage.replaceChild(legend(scene), stage.children[1] ?? map)
          }

          const next = fillOf(scene)

          for (const path of shapes(map)) {
            const country = path.dataset["country"] ?? ""
            const colour = next.get(country) ?? light.blank

            if (colours.get(country) === colour) continue

            colours.set(country, colour)
            animate(path, { fill: colour }, { duration: duration(0.45) })
          }
        }

        // oxlint-disable-next-line no-await-in-loop
        await wait(named.length > 0 ? 140 : 500)
      }
    }

    replay.addEventListener("click", () => void play())
    onRemove(root, () => {
      run += 1
    })
    void play()

    return root
  },
}

// The box around some countries on a map, padded, in the sheet's units.
const around = (map: SVGSVGElement, codes: ReadonlyArray<Country>) => {
  const boxes = codes.flatMap((code) => {
    const path = map.querySelector<SVGPathElement>(`path[data-country="${code}"]`)

    return path === null ? [] : [path.getBBox()]
  })

  const left = Math.min(...boxes.map((box) => box.x))
  const top = Math.min(...boxes.map((box) => box.y))
  const right = Math.max(...boxes.map((box) => box.x + box.width))
  const bottom = Math.max(...boxes.map((box) => box.y + box.height))
  const pad = Math.max(right - left, bottom - top) * 0.15

  return [left - pad, top - pad, right - left + pad * 2, bottom - top + pad * 2]
}

const zoomStops: ReadonlyArray<{
  readonly name: string
  readonly countries: ReadonlyArray<Country>
}> = [
  { name: "Europe", countries: [] },
  { name: "Benelux", countries: ["BEL", "NLD", "LUX"] },
  { name: "Baltics", countries: ["EST", "LVA", "LTU"] },
  { name: "Iberia", countries: ["ESP", "PRT"] },
  { name: "Nordics", countries: ["DNK", "SWE", "FIN"] },
]

// Zooming inside one sheet: every stop uses the same geometry, so the
// viewBox flies between them with nothing swapped. Countries outside the stop
// fade back; strokes keep their width at any zoom.
export const ZoomWithinASheet: StoryObj = {
  loaders: [
    async () => ({
      scene: await draw({
        title: "Unemployment rate, %",
        source: "Illustrative values",
        fill: { kind: "choropleth", values: illustrative(europe, 9), better: "lower" },
      }),
    }),
  ],
  render: (_, { loaded }) => {
    const scene: Scene = loaded["scene"]
    const map = bare(scene)
    const root = document.createElement("div")
    const controls = document.createElement("div")
    const caption = document.createElement("p")
    const full = [0, 0, scene.width, scene.height]
    let flight: { stop: () => void } | undefined

    root.style.cssText = "max-width:900px;font-family:system-ui,sans-serif"
    controls.style.cssText = "display:flex;gap:8px;margin-bottom:8px"
    // A fixed aspect ratio, so the map keeps its size while the viewBox zooms.
    map.style.cssText = `display:block;width:100%;height:auto;aspect-ratio:${scene.width} / ${scene.height};background:#fcfcfb`
    caption.setAttribute("aria-live", "polite")

    const buttons = zoomStops.map((stop) => {
      const button = document.createElement("button")

      button.textContent = stop.name
      button.setAttribute("aria-pressed", `${stop.countries.length === 0}`)
      button.addEventListener("click", () => {
        for (const each of buttons) each.setAttribute("aria-pressed", `${each === button}`)

        const from = (map.getAttribute("viewBox") ?? "").split(" ").map(Number)
        const to = stop.countries.length === 0 ? full : around(map, stop.countries)

        flight?.stop()
        flight = animate(0, 1, {
          duration: duration(0.9),
          ease: "easeInOut",
          onUpdate: (progress) =>
            map.setAttribute(
              "viewBox",
              from
                .map((start, index) => start + ((to[index] ?? start) - start) * progress)
                .join(" "),
            ),
        })

        for (const path of shapes(map)) {
          const inside =
            stop.countries.length === 0 ||
            stop.countries.some((code) => code === path.dataset["country"])

          animate(path, { fillOpacity: inside ? 1 : 0.35 }, { duration: duration(0.6) })
        }

        caption.textContent =
          stop.countries.length === 0
            ? "Showing all of Europe."
            : `Zoomed to ${stop.name}: ${stop.countries
                .map((code) => scene.shapes.find((shape) => shape.country === code)?.label ?? code)
                .join(", ")}.`
      })

      return button
    })

    const heading = document.createElement("h3")

    heading.textContent = scene.title ?? ""
    controls.append(...buttons)
    root.append(heading, controls, map, legend(scene), caption, credits(scene))

    return root
  },
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

const button = (text: string, label: string, act: () => void) => {
  const element = document.createElement("button")

  element.textContent = text
  element.setAttribute("aria-label", label)
  element.addEventListener("click", act)

  return element
}

// Dragging moves the map; a flick keeps it gliding to a stop, held inside the
// sheet's edges. Scroll, the +/− buttons or the + and − keys zoom, and the
// arrow keys move the view, so the map works without a pointer. All of it
// changes one viewBox: the geometry never changes, so movement stays smooth.
export const DragToMove: StoryObj = {
  loaders: [
    async () => ({
      scene: await draw({
        title: "Share of adults with a bank account, %",
        source: "Illustrative values",
        fill: {
          kind: "choropleth",
          values: illustrative(
            countries.map((country) => country.code),
            12,
          ),
        },
      }),
    }),
  ],
  render: (_, { loaded }) => {
    const scene: Scene = loaded["scene"]
    const map = bare(scene)
    const root = document.createElement("div")
    const frame = document.createElement("div")
    const controls = document.createElement("div")
    const hint = document.createElement("p")
    const width = scene.width
    const height = scene.height
    const zoom = { min: 1, max: 4 }

    // The view: how far it is zoomed in, and its top-left corner in sheet units.
    const scale = motionValue(2)
    const x = motionValue(width * 0.35)
    const y = motionValue(height * 0.1)

    const size = () => ({ w: width / scale.get(), h: height / scale.get() })
    const bounds = () => ({ x: width - size().w, y: height - size().h })

    const render = () => {
      const { w, h } = size()

      map.setAttribute("viewBox", `${x.get()} ${y.get()} ${w} ${h}`)
    }

    for (const value of [scale, x, y]) value.on("change", render)
    render()

    const stop = () => {
      for (const value of [scale, x, y]) value.stop()
    }

    // Zooms to a scale, keeping the sheet point under (fx, fy) in place;
    // fx and fy are shares of the frame's width and height.
    const zoomTo = (target: number, { fx = 0.5, fy = 0.5, glide = true } = {}) => {
      const next = clamp(target, zoom.min, zoom.max)
      const { w, h } = size()
      const px = x.get() + fx * w
      const py = y.get() + fy * h
      const nx = clamp(px - (fx * width) / next, 0, width - width / next)
      const ny = clamp(py - (fy * height) / next, 0, height - height / next)

      stop()

      if (!glide) {
        scale.set(next)
        x.set(nx)
        y.set(ny)

        return
      }

      const options = { duration: duration(0.35), ease: "easeOut" } as const

      animate(scale, next, options)
      animate(x, nx, options)
      animate(y, ny, options)
    }

    const moveBy = (dx: number, dy: number) => {
      const options = { duration: duration(0.3), ease: "easeOut" } as const

      stop()
      animate(x, clamp(x.get() + dx, 0, bounds().x), options)
      animate(y, clamp(y.get() + dy, 0, bounds().y), options)
    }

    let drag:
      | { readonly px: number; readonly py: number; readonly x: number; readonly y: number }
      | undefined

    map.addEventListener("pointerdown", (event) => {
      stop()
      map.setPointerCapture(event.pointerId)
      map.style.cursor = "grabbing"
      drag = { px: event.clientX, py: event.clientY, x: x.get(), y: y.get() }
    })

    map.addEventListener("pointermove", (event) => {
      if (drag === undefined) return

      // Screen pixels to sheet units at the current zoom.
      const ratio = size().w / map.clientWidth

      x.set(clamp(drag.x - (event.clientX - drag.px) * ratio, 0, bounds().x))
      y.set(clamp(drag.y - (event.clientY - drag.py) * ratio, 0, bounds().y))
    })

    const release = () => {
      if (drag === undefined) return

      drag = undefined
      map.style.cursor = "grab"

      if (reduced()) return

      // Keep the flick's speed and let it decay, bouncing softly off the edges.
      const glide = {
        type: "inertia",
        power: 0.35,
        timeConstant: 280,
        bounceStiffness: 300,
      } as const

      animate(x, x.get(), { ...glide, velocity: x.getVelocity(), min: 0, max: bounds().x })
      animate(y, y.get(), { ...glide, velocity: y.getVelocity(), min: 0, max: bounds().y })
    }

    map.addEventListener("pointerup", release)
    map.addEventListener("pointercancel", release)

    map.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault()

        const box = map.getBoundingClientRect()

        zoomTo(scale.get() * Math.exp(-event.deltaY * 0.0015), {
          fx: (event.clientX - box.left) / box.width,
          fy: (event.clientY - box.top) / box.height,
          glide: false,
        })
      },
      { passive: false },
    )

    frame.tabIndex = 0
    frame.setAttribute("role", "group")
    frame.setAttribute(
      "aria-label",
      "Map. Drag or use the arrow keys to move, scroll or press + and − to zoom.",
    )
    frame.addEventListener("keydown", (event) => {
      const step = size().w * 0.15
      const moves: Readonly<Record<string, readonly [number, number]>> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }

      const move = moves[event.key]

      if (move !== undefined) moveBy(...move)
      else if (event.key === "+" || event.key === "=") zoomTo(scale.get() * 1.5)
      else if (event.key === "-") zoomTo(scale.get() / 1.5)
      else return

      event.preventDefault()
    })

    controls.style.cssText = "display:flex;gap:8px;margin-bottom:8px"
    controls.append(
      button("+", "Zoom in", () => zoomTo(scale.get() * 1.5)),
      button("−", "Zoom out", () => zoomTo(scale.get() / 1.5)),
      button("Reset", "Show the whole map", () => zoomTo(zoom.min)),
    )

    root.style.cssText = "max-width:900px;font-family:system-ui,sans-serif"
    frame.style.cssText = "border-radius:6px;overflow:hidden;outline-offset:2px"
    map.style.cssText = `display:block;width:100%;height:auto;aspect-ratio:${width} / ${height};background:#fcfcfb;cursor:grab;touch-action:none;user-select:none`
    hint.style.cssText = "font-size:13px;color:#52514e;margin:4px 0"
    hint.textContent = "Drag to move. Scroll, use + and −, or the keyboard to zoom and move."

    const heading = document.createElement("h3")

    heading.textContent = scene.title ?? ""
    frame.append(map)
    root.append(heading, controls, frame, hint, legend(scene), credits(scene))
    onRemove(root, stop)

    return root
  },
}
