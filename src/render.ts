import { draw, type Drawn } from "./draw.ts"
import { describe, parse, type Spec } from "./spec.ts"
import { dark, light, type Palette, type Schemes, svg } from "./svg.ts"

// Why text is not a map, one line per problem, as `describe` words them.
export interface Refused {
  readonly ok: false
  readonly lines: ReadonlyArray<string>
}

// JSON a model wrote, read into a spec, or the lines that say what to fix.
export const read = (text: string): { readonly ok: true; readonly spec: Spec } | Refused => {
  let input: unknown

  try {
    input = JSON.parse(text)
  } catch (error) {
    return {
      ok: false,
      lines: [`spec: expected JSON. ${error instanceof Error ? error.message : String(error)}`],
    }
  }

  const parsed = parse(input)

  return parsed.ok ? parsed : { ok: false, lines: parsed.issues.map(describe) }
}

export interface RenderOptions {
  // Defaults to `{ light, dark }`: the map follows the page's `color-scheme`.
  readonly palette?: Palette | Schemes
}

// JSON a model wrote, drawn as an SVG document, or the lines that say what to
// fix. `<map-chart>` and the CLI both report through this one function.
export const render = async (
  text: string,
  { palette = { light, dark } }: RenderOptions = {},
): Promise<{ readonly ok: true; readonly svg: string } | Refused> => {
  const spec = read(text)

  if (!spec.ok) return spec

  let drawn: Drawn

  try {
    drawn = await draw(spec.spec)
  } catch (error) {
    // A sheet that failed to load, such as offline.
    return { ok: false, lines: [`draw: ${error instanceof Error ? error.message : String(error)}`] }
  }

  // An area code the sheet does not draw: only the loaded sheet knows.
  return drawn.ok
    ? { ok: true, svg: svg(drawn.scene, { palette }) }
    : { ok: false, lines: drawn.issues.map(describe) }
}
