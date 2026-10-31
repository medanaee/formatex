import { useRef, useState } from "react"
import { CornerDownRight, Info } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { OverrideRequest } from "@/lib/editor/overrideGutter"
import type { FrontMatterEntry } from "@/lib/editor/overrides"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"

/** What the popover says: the document sets this setting, so the config value is not used; the document's value; a jump to its line. */
function OverrideCard({ entry, file, onJump }: { entry: FrontMatterEntry; file: string; onJump?: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5 text-xs">
      <p dir="auto">{t("overrides.text", { file })}</p>
      {entry.value !== "" && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-muted-foreground">{t("overrides.value")}</span>
          <code dir="ltr" className="min-w-0 truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            {entry.value}
          </code>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="-ms-2 h-8 gap-1.5 text-xs"
        onClick={() => {
          void useEditorStore.getState().revealAt(file, entry.line, 1)
          onJump?.()
        }}
      >
        <CornerDownRight className="rtl:rotate-90" />
        {t("overrides.goto", { line: entry.line })}
      </Button>
    </div>
  )
}

/** The blue info icon in front of a setting the document overrides. A mouse over it opens the popover; a tap does on a touch screen. */
export function OverrideBadge({ entry, file, className }: { entry: FrontMatterEntry; file: string; className?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hover = (on: boolean) => (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return
    clearTimeout(timer.current)
    if (on) setOpen(true)
    else timer.current = setTimeout(() => setOpen(false), 150)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={t("overrides.mark")} onPointerEnter={hover(true)} onPointerLeave={hover(false)} className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-info outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2.5" onOpenAutoFocus={(event) => event.preventDefault()} onPointerEnter={hover(true)} onPointerLeave={hover(false)}>
        <OverrideCard entry={entry} file={file} onJump={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

/** The same popover for the mark in the code editor's gutter, anchored where the mark is. */
export function OverridePopover({ request, file, onRequestChange }: { request: OverrideRequest | null; file: string; onRequestChange: (request: OverrideRequest | null) => void }) {
  if (!request) return null
  const a = request.anchor
  return (
    <Popover open onOpenChange={(open) => !open && onRequestChange(null)}>
      <PopoverAnchor asChild>
        <span style={{ position: "fixed", left: a.left, top: a.top, width: a.width, height: a.height, pointerEvents: "none" }} />
      </PopoverAnchor>
      <PopoverContent align="start" className="w-64 p-2.5" onOpenAutoFocus={(event) => event.preventDefault()} onCloseAutoFocus={(event) => event.preventDefault()}>
        <OverrideCard entry={request.override.override} file={file} onJump={() => onRequestChange(null)} />
      </PopoverContent>
    </Popover>
  )
}
