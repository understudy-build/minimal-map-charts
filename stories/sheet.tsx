import { Children, isValidElement, type ReactElement, type ReactNode } from "react"

import type { Country as Code, Layout, Place, Region as RegionConfig } from "../src/index.ts"

// JSX that writes a layout. The components render nothing: `layout` reads
// the element tree into the same object a model would send as `sheet`.

interface SheetProps {
  readonly scale?: "shared" | "fit"
  readonly insets?: boolean
  readonly context?: boolean
  readonly children?: ReactNode
}

interface PanelProps {
  readonly children?: ReactNode
}

interface CountryProps {
  readonly code: Code
  readonly insets?: boolean
}

interface RegionProps {
  readonly id: RegionConfig["id"] | "world"
}

export const Sheet: (props: SheetProps) => null = () => null
export const Panel: (props: PanelProps) => null = () => null
export const Country: (props: CountryProps) => null = () => null
export const Region: (props: RegionProps) => null = () => null

const elements = (children: ReactNode) => Children.toArray(children).filter(isValidElement)

const places = (children: ReactNode): ReadonlyArray<Place> =>
  elements(children).flatMap((child): ReadonlyArray<Place> => {
    if (child.type === Country) {
      const { code, insets } = child.props as CountryProps

      return [insets === undefined ? code : { country: code, insets }]
    }

    if (child.type === Region) return [(child.props as RegionProps).id]

    return []
  })

export const layout = (sheet: ReactElement<SheetProps>): Layout => {
  const { scale, insets, context, children } = sheet.props
  const shared = {
    ...(scale === undefined ? {} : { scale }),
    ...(insets === undefined ? {} : { insets }),
    ...(context === undefined ? {} : { context }),
  }
  const panels = elements(children).filter((child) => child.type === Panel)

  if (panels.length === 0) {
    const listed = places(children)

    return listed.length === 0 ? shared : { ...shared, places: listed }
  }

  if (places(children).length > 0) throw new Error("A <Sheet> holds places or panels, not both.")

  return {
    ...shared,
    panels: panels.map((panel) => ({ places: places((panel.props as PanelProps).children) })),
  }
}
