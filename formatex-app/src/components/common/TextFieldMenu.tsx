import { useEffect, useState } from "react"
import { Clipboard, Copy, Scissors, TextSelect } from "lucide-react"
import { useTranslation } from "react-i18next"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Field = HTMLInputElement | HTMLTextAreaElement

const isTextField = (element: EventTarget | null): element is Field =>
  (element instanceof HTMLInputElement && /^(text|search|url|email|tel|number|password)$/.test(element.type)) || element instanceof HTMLTextAreaElement

/**
 * The app draws its own context menus, so the browser's is never shown. Anywhere that has no menu of its own the right click is
 * swallowed; on a text field it opens a small Cut / Copy / Paste / Select all menu. (The editor and the cards have theirs.)
 */
export function TextFieldMenu() {
  const { t } = useTranslation()
  const [menu, setMenu] = useState<{ x: number; y: number; field: Field } | null>(null)

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      // Radix menus of the app mark their trigger; they handle the event themselves
      if ((event.target as HTMLElement | null)?.closest?.("[data-slot=context-menu-trigger]")) return
      event.preventDefault()
      if (isTextField(event.target) && !event.target.closest(".cm-editor")) setMenu({ x: event.clientX, y: event.clientY, field: event.target })
    }
    document.addEventListener("contextmenu", onContextMenu)
    return () => document.removeEventListener("contextmenu", onContextMenu)
  }, [])

  const field = menu?.field
  const selected = field ? field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0) : ""
  const act = (run: (field: Field) => void | Promise<void>) => () => {
    if (!field) return
    field.focus()
    void run(field)
  }

  return (
    <DropdownMenu open={menu !== null} onOpenChange={(open) => !open && setMenu(null)}>
      <DropdownMenuTrigger asChild>
        <span aria-hidden style={{ position: "fixed", left: menu?.x ?? 0, top: menu?.y ?? 0, width: 1, height: 1, pointerEvents: "none" }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40" onCloseAutoFocus={(event) => event.preventDefault()}>
        <DropdownMenuItem
          disabled={!selected || field?.readOnly}
          onSelect={act(async (target) => {
            await navigator.clipboard.writeText(selected)
            document.execCommand("delete")
            void target
          })}
        >
          <Scissors /> {t("menu.cut")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!selected} onSelect={act(() => navigator.clipboard.writeText(selected))}>
          <Copy /> {t("menu.copy")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={field?.readOnly}
          onSelect={act(async () => {
            document.execCommand("insertText", false, await navigator.clipboard.readText())
          })}
        >
          <Clipboard /> {t("menu.paste")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={act((target) => target.select())}>
          <TextSelect /> {t("menu.selectAll")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
