import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { ColorPicker } from "@/components/common/ColorPicker"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { normalizeHex, presetMatches, resolveColor } from "@/lib/editor/colors"
import { PALETTE } from "@/lib/editor/palette"

/** A color value as text with its swatch. Typing a name suggests the engine's presets; the swatch and a `#` open the picker. */
export function ColorField({ value, onChange, placeholder, hexOnly = false, className }: { value: string; onChange: (value: string) => void; placeholder?: string; /** Only hex colors are valid (a theme's colors): no preset names, and a half-typed hex is not reported. */ hexOnly?: boolean; className?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const row = useRef<HTMLDivElement>(null)
  // What is being typed, which may not be a color yet
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const shown = resolveColor(draft)
  const matches = hexOnly ? [] : presetMatches(draft, 8)
  const update = (next: string) => {
    setDraft(next)
    if (!hexOnly || normalizeHex(next)) onChange(next)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={row} className={`flex items-center gap-1.5 ${className ?? ""}`}>
          <button
            type="button"
            aria-label={t("color.pick")}
            title={t("color.pick")}
            onClick={() => setOpen((current) => !current)}
            className="size-8 shrink-0 rounded-lg border border-input outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={shown ? { background: shown } : undefined}
          />
          <Input
            dir="ltr"
            value={draft}
            spellCheck={false}
            placeholder={placeholder ?? (hexOnly ? "#3366ff" : "blue · #3366ff")}
            aria-label={t("color.pick")}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              update(event.target.value)
              // Typing a `#` starts a custom color: the picker is what the user needs
              if (event.target.value.startsWith("#")) setOpen(true)
            }}
            className="h-8 text-xs"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-60 gap-2 p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => row.current?.contains(event.target as Node) && event.preventDefault()}
      >
        {matches.length > 0 && draft.trim() !== "" && (
          <div className="mb-2 flex flex-wrap gap-1">
            {matches.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  update(name)
                  setOpen(false)
                }}
                className="flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="size-2.5 rounded-full" style={{ background: resolveColor(name) ?? PALETTE.gray[5] }} />
                {name}
              </button>
            ))}
          </div>
        )}
        <ColorPicker value={draft} onChange={update} names={!hexOnly} />
      </PopoverContent>
    </Popover>
  )
}

const UNITS = ["pt", "mm", "cm", "in", "em", "%"] as const
const NUMBER = String.raw`-?(?:\d+\.?\d*|\.\d+)`
const LENGTH = new RegExp(String.raw`^\s*(${NUMBER})\s*(pt|mm|cm|in|em|%)?\s*$`)

/** `12pt` to its number and unit; `null` when it is not a simple length (a Typst expression such as `1fr + 2pt`). */
export function splitLength(value: string): { amount: string; unit: string } | null {
  if (value.trim() === "") return { amount: "", unit: "" }
  const match = LENGTH.exec(value)
  return match ? { amount: match[1], unit: match[2] ?? "" } : null
}

/** A length as a number and a unit, so the number cannot be written without one by mistake. Anything else stays editable as text. */
export function LengthField({ value, onChange, placeholder, defaultUnit = "pt" }: { value: string; onChange: (value: string) => void; placeholder?: string; defaultUnit?: string }) {
  const parts = splitLength(value)
  if (!parts) return <Input dir="ltr" value={value} aria-label="length" onChange={(event) => onChange(event.target.value)} className="h-8 text-xs" />
  const unit = parts.unit || defaultUnit
  return (
    <div className="flex gap-1.5" dir="ltr">
      <Input
        value={parts.amount}
        inputMode="decimal"
        placeholder={placeholder}
        aria-label="length"
        onChange={(event) => {
          const amount = event.target.value.replace(",", ".")
          if (amount.trim() === "") onChange("")
          else if (new RegExp(`^${NUMBER}$`).test(amount)) onChange(`${amount}${unit}`)
        }}
        className="h-8 flex-1 text-xs"
      />
      <Select value={unit} onValueChange={(next) => parts.amount !== "" && onChange(`${parts.amount}${next}`)}>
        <SelectTrigger className="h-8 w-16 text-xs" aria-label="unit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent><SelectGroup>
          {UNITS.map((item) => (
            <SelectItem key={item} value={item} className="text-xs">
              {item}
            </SelectItem>
          ))}
        </SelectGroup></SelectContent>
      </Select>
    </div>
  )
}
