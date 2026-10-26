import { ColorPicker } from "@/components/common/ColorPicker"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import type { ColorRequest } from "@/lib/editor/colorSwatches"
import { useEditorViewStore } from "@/stores/useEditorViewStore"

/** The color picker for a color in the text: every change is written into the text at once, over the color that was there. */
export function ColorPopover({ request, onRequestChange }: { request: ColorRequest | null; onRequestChange: (request: ColorRequest | null) => void }) {
  const view = useEditorViewStore((state) => state.view)
  if (!request) return null
  const a = request.anchor

  const change = (value: string) => {
    if (!view) return
    view.dispatch({ changes: { from: request.from, to: request.to, insert: value } })
    onRequestChange({ ...request, to: request.from + value.length, value })
  }

  return (
    <Popover open onOpenChange={(open) => !open && onRequestChange(null)}>
      <PopoverAnchor asChild>
        <span style={{ position: "fixed", left: a.left, top: a.top, width: a.width, height: a.height, pointerEvents: "none" }} />
      </PopoverAnchor>
      <PopoverContent align="start" className="w-60 p-2" onOpenAutoFocus={(event) => event.preventDefault()} onCloseAutoFocus={(event) => { event.preventDefault(); view?.focus() }}>
        <ColorPicker value={request.value} onChange={change} names={false} />
      </PopoverContent>
    </Popover>
  )
}
