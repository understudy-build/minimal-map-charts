import {
  cite,
  type Country,
  dark,
  describe,
  draw,
  type DrawOptions,
  light,
  paint,
  type Palette,
  range,
  type Scene,
  type Spec,
  svg,
} from "../src/index.ts"

export interface FigureOptions {
  readonly palette?: Palette
}

// A scene as a page would show it: the SVG, then the table of rows that
// every map offers for screen readers and copying.
export const figure = (scene: Scene, { palette = light }: FigureOptions = {}) => {
  const root = document.createElement("figure")

  root.style.cssText = `margin:0;max-width:900px;padding:16px;background:${palette.surface};color:${palette.ink};font-family:system-ui,sans-serif`
  root.innerHTML = svg(scene, { palette })

  if (scene.rows.length > 0) {
    const details = document.createElement("details")
    const rows = scene.rows
      .map(
        (row) =>
          `<tr><td>${row.name}</td><td style="text-align:right">${row.value ?? ""}</td></tr>`,
      )
      .join("")

    details.innerHTML = `<summary style="cursor:pointer;color:${palette.muted}">Data table</summary><table style="border-collapse:collapse;margin-top:8px"><thead><tr><th style="text-align:left">${scene.rows.some((row) => row.area !== undefined) ? "Area" : "Country"}</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>`
    root.append(details)
  }

  if (scene.points !== undefined) {
    const details = document.createElement("details")
    const rows = scene.points.sites
      .map(
        (site) =>
          `<tr><td>${escape(site.name)}</td><td style="text-align:right">${site.value ?? ""}</td><td style="text-align:right">${site.lat}</td><td style="text-align:right">${site.lon}</td></tr>`,
      )
      .join("")

    details.innerHTML = `<summary style="cursor:pointer;color:${palette.muted}">Points</summary><table style="border-collapse:collapse;margin-top:8px"><thead><tr><th style="text-align:left">Site</th><th>${escape(scene.points.label ?? "Value")}</th><th>Latitude</th><th>Longitude</th></tr></thead><tbody>${rows}</tbody></table>`
    root.append(details)
  }

  return root
}

export const palettes = { light, dark } as const

// The scene for a spec a story writes itself: one `draw` refuses is a bug in
// the story, so the story fails with the lines a model would read.
export const drawn = async (spec: Spec, options?: DrawOptions): Promise<Scene> => {
  const result = await draw(spec, options)

  if (!result.ok) throw new Error(result.issues.map(describe).join("\n"))

  return result.scene
}

// Illustrative numbers, not real statistics: stories need believable values
// without implying a source.
export const illustrative = (
  codes: ReadonlyArray<Country>,
  seed: number,
): ReadonlyArray<{ readonly country: Country; readonly value: number }> =>
  codes.map((country, index) => {
    const wave = Math.sin(seed * 0.9 + index * 1.7) + Math.cos(seed * 0.4 + index * 0.6)

    return { country, value: Math.round((5 + wave * 2.4 + (index % 5)) * 10) / 10 }
  })

const escape = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;")

// The map alone, for stories that animate it: land, countries and borders.
// Strokes keep their width when a story zooms the viewBox, and the title,
// legend and credits live in HTML beside it, so they never zoom.
export const bare = (scene: Scene, { palette = light }: FigureOptions = {}) => {
  const holder = document.createElement("div")

  holder.innerHTML = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-label="${escape(scene.description)}" style="display:block;width:100%;height:auto">`,
    `<path d="${scene.land}" fill="${palette.land}"/>`,
    ...scene.shapes.map(
      (shape) =>
        `<path d="${shape.path}" data-country="${shape.country}" fill="${paint(shape.tone, { palette })}" stroke="${palette.stroke}" stroke-width="1" vector-effect="non-scaling-stroke"><title>${escape(shape.label)}</title></path>`,
    ),
    ...scene.borders.map(
      (border) =>
        `<path d="${border.path}" fill="none" stroke="${palette.stroke}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`,
    ),
    `</svg>`,
  ].join("")

  return holder.firstElementChild as SVGSVGElement
}

// A scene's legend as an HTML list, with a "No data" entry when any country
// is blank.
export const legend = (scene: Scene, { palette = light }: FigureOptions = {}) => {
  const list = document.createElement("ul")
  const key = scene.legend

  list.style.cssText = `display:flex;flex-wrap:wrap;gap:4px 16px;list-style:none;padding:0;margin:8px 0;font-size:14px;color:${palette.muted}`

  if (key === undefined) return list

  const items = [
    ...(key.better === undefined
      ? []
      : [
          {
            colour: undefined,
            text: key.better === "higher" ? "Higher is better" : "Lower is better",
          },
        ]),
    ...key.bins.map((bin) => ({
      colour: paint(bin.shade, { palette }),
      text: range(bin),
    })),
    ...(scene.shapes.some((shape) => shape.tone.kind === "blank")
      ? [{ colour: palette.blank, text: "No data" }]
      : []),
  ]

  list.append(
    ...items.map(({ colour, text }) => {
      const item = document.createElement("li")

      item.style.cssText = "display:flex;align-items:center;gap:6px"
      item.innerHTML =
        colour === undefined
          ? `<span style="color:${palette.ink}">${text}</span>`
          : `<span aria-hidden="true" style="width:12px;height:12px;border-radius:2px;background:${colour}"></span>${text}`

      return item
    }),
  )

  return list
}

export const credits = (scene: Scene, { palette = light }: FigureOptions = {}) => {
  const note = document.createElement("p")

  note.style.cssText = `font-size:12px;color:${palette.muted};margin:4px 0`
  note.textContent = [
    ...(scene.source === undefined ? [] : [`Data: ${scene.source}.`]),
    ...scene.credits.map(cite),
  ].join(" ")

  return note
}

// Runs `stop` once Storybook removes the element, to end timers and loops.
export const onRemove = (element: Element, stop: () => void) => {
  const watch = new MutationObserver(() => {
    if (element.isConnected) return

    stop()
    watch.disconnect()
  })

  queueMicrotask(() => watch.observe(document.body, { childList: true, subtree: true }))
}
