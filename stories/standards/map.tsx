import { Suspense } from "react"

import { parse, type Spec } from "../../src/index.ts"
import { Figure, useDrawn } from "../frameworks/react/figure.tsx"

const Drawn = ({ spec }: { readonly spec: Spec }) => (
  <Figure.Root drawn={useDrawn(spec)}>
    <Figure.Title />
    <Figure.Map />
    <Figure.Insets />
    <Figure.Legend />
    <Figure.Credits />
  </Figure.Root>
)

// The map component both recipes register: whatever props the UI format
// hands it, `parse` and then `draw` decide. A spec that does not parse or
// draw shows the lines a model would get back.
export const Map = ({ input }: { readonly input: unknown }) => {
  const parsed = parse(input)

  return parsed.ok ? (
    <Suspense fallback={<p className="text-sm">Drawing the map…</p>}>
      <Drawn spec={parsed.spec} />
    </Suspense>
  ) : (
    <Figure.Issues issues={parsed.issues} />
  )
}
