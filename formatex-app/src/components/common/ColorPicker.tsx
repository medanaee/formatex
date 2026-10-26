import { useEffect, useRef, useState, type PointerEvent } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { hexToRgb, hsvToRgb, normalizeHex, PRESET_NAMES, resolveColor, rgbToHex, rgbToHsv, type Hsv } from "@/lib/editor/colors"
import { PALETTE } from "@/lib/editor/palette"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  /** A preset name, a shade or a hex color. */
  value: string
  /** The new value: a hex while the square or the slider is dragged, a preset's name when one is chosen. */
  onChange: (value: string) => void
  /** A click on a preset gives its name (the default), or its hex when the place that is edited takes only hex colors. */
  names?: boolean
  className?: string
}

/** Position of a pointer inside an element, 0..1 on each axis. */
function relative(event: PointerEvent<HTMLElement>): { x: number; y: number } {
  const rect = event.currentTarget.getBoundingClientRect()
  return { x: Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1), y: Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1) }
}

/** A drag area: reports the position on press and while the pointer moves. */
function Surface({ onMove, className, style, label, children }: { onMove: (x: number, y: number) => void; className?: string; style?: React.CSSProperties; label: string; children: React.ReactNode }) {
  const active = useRef(false)
  const handle = (event: PointerEvent<HTMLDivElement>) => {
    const { x, y } = relative(event)
    onMove(x, y)
  }
  return (
    <div
      role="presentation"
      aria-label={label}
      className={cn("relative cursor-crosshair touch-none select-none", className)}
      style={style}
      onPointerDown={(event) => {
        active.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        handle(event)
      }}
      onPointerMove={(event) => active.current && handle(event)}
      onPointerUp={() => (active.current = false)}
      onPointerCancel={() => (active.current = false)}
    >
      {children}
    </div>
  )
}

/**
 * A compact color picker: a saturation / brightness square, a hue slider, the hex as text, and the engine's preset colors (a
 * click on a preset gives its name, which the engine understands, and which follows the theme's tints).
 */
export function ColorPicker({ value, onChange, names = true, className }: ColorPickerProps) {
  const { t } = useTranslation()
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(hexToRgb(resolveColor(value) ?? "#3366ff")))
  const [text, setText] = useState(value)

  // The value changed from outside (typing in the document): follow it, unless it is what this picker just wrote
  useEffect(() => {
    const hex = resolveColor(value)
    setText(value)
    if (hex && hex !== rgbToHex(hsvToRgb(hsv))) setHsv(rgbToHsv(hexToRgb(hex)))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only an outside change of the value matters
  }, [value])

  const emit = (next: Hsv) => {
    setHsv(next)
    const hex = rgbToHex(hsvToRgb(next))
    setText(hex)
    onChange(hex)
  }
  const hueColor = rgbToHex(hsvToRgb({ h: hsv.h, s: 1, v: 1 }))

  return (
    <div className={cn("grid gap-2", className)}>
      <Surface label={t("color.square")} onMove={(x, y) => emit({ ...hsv, s: x, v: 1 - y })} className="h-28 w-full rounded-md" style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}>
        <span className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ring-1 ring-black/40" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: rgbToHex(hsvToRgb(hsv)) }} />
      </Surface>
      <Surface label={t("color.hue")} onMove={(x) => emit({ ...hsv, h: x * 360 })} className="h-3 w-full rounded-full" style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}>
        <span className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ring-1 ring-black/40" style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }} />
      </Surface>
      <Input
        dir="ltr"
        value={text}
        spellCheck={false}
        aria-label={t("color.hex")}
        onChange={(event) => {
          setText(event.target.value)
          const hex = normalizeHex(event.target.value)
          if (hex) {
            setHsv(rgbToHsv(hexToRgb(hex)))
            onChange(hex)
          }
        }}
        className="h-7 font-mono text-xs md:text-xs"
      />
      <div className="grid grid-cols-11 gap-1" role="listbox" aria-label={t("color.presets")}>
        {PRESET_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            role="option"
            aria-selected={value === name}
            title={name}
            aria-label={name}
            onClick={() => onChange(names ? name : PALETTE[name][5])}
            className={cn("aspect-square rounded-[4px] outline-none ring-offset-1 ring-offset-popover focus-visible:ring-2 focus-visible:ring-ring", value === name && "ring-2 ring-foreground")}
            style={{ background: PALETTE[name][5] }}
          />
        ))}
      </div>
    </div>
  )
}
