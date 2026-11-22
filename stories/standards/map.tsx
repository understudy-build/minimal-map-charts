import { Suspense } from "react"

import { describe, parse, type Spec } from "../../src/index.ts"
import { Figure, useScene } from "../frameworks/react/figure.tsx"

const Drawn = ({ spec }: { readonly spec: Spec }) => (
  <Figure.Root scene={useScene(spec)}>
    <Figure.Title />
    <Figure.Map />
    <Figure.Insets />
    <Figure.Legend />
    <Figure.Credits />
  </Figure.Root>
)

// The map component both recipes register: whatever props the UI format
// hands it, `parse` decides. A spec that does not parse shows the lines a
// model would get back.
export const Map = ({ input }: { readonly input: unknown }) => {
  const parsed = parse(input)

  return parsed.ok ? (
    <Suspense fallback={<p className="text-sm">Drawing the map…</p>}>
      <Drawn spec={parsed.spec} />
    </Suspense>
  ) : (
    <ul role="alert" className="font-mono text-sm text-red-700">
      {parsed.issues.map((issue) => (
        <li key={describe(issue)}>{describe(issue)}</li>
      ))}
    </ul>
  )
}
