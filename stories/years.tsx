import { Pause, Play } from "lucide-react"
import { useEffect, useEffectEvent, useState } from "react"
import { createRoot } from "react-dom/client"

import { Button } from "./ui/button.tsx"
import { Slider } from "./ui/slider.tsx"

// A slider reports one value per thumb; this one has one.
const first = (value: number | ReadonlyArray<number>) => [value].flat()[0] ?? 0

// How long play shows each year.
const step = 1200

export interface YearsProps {
  readonly years: ReadonlyArray<number>
  // Called with the index of the year to show.
  readonly onYear: (index: number) => void
}

// Play and a slider over the years: moving the slider pauses play, and play
// stops at the last year.
export const Years = ({ years, onYear }: YearsProps) => {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const last = years.length - 1

  const show = (next: number) => {
    setIndex(next)
    onYear(next)
  }

  const advance = useEffectEvent(() => {
    const next = Math.min(index + 1, last)

    show(next)

    if (next === last) setPlaying(false)
  })

  useEffect(() => {
    if (!playing) return undefined

    const timer = setInterval(advance, step)

    return () => clearInterval(timer)
  }, [playing])

  return (
    <div className="flex max-w-md flex-col gap-2 font-[inherit]">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="font-[inherit]"
          onClick={() => {
            // Played to its end, it starts again from the first year.
            if (!playing && index === last) show(0)

            setPlaying(!playing)
          }}
        >
          {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
          {playing ? "Pause" : "Play"}
        </Button>
        <output aria-live="polite" className="text-sm font-medium tabular-nums">
          {years[index]}
        </output>
      </div>
      <Slider
        aria-label="Year"
        value={[index]}
        min={0}
        max={last}
        step={1}
        onValueChange={(value) => {
          setPlaying(false)
          show(first(value))
        }}
      />
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{years[0]}</span>
        <span>{years[last]}</span>
      </div>
    </div>
  )
}

// Mounts the controls into a plain DOM node, for stories that are not React.
export const mountYears = (element: HTMLElement, props: YearsProps) => {
  const root = createRoot(element)

  root.render(<Years {...props} />)

  return () => root.unmount()
}
