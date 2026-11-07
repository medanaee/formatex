import type { ReactNode } from "react"
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

export type MenuAction = { key: string; label: string; icon: ReactNode; onSelect: () => void; destructive?: boolean; disabled?: boolean } | "separator"

/** The same list of actions as a right-click menu and as the three-dot menu of a row or a card. */
export function ActionItems({ actions, kind }: { actions: MenuAction[]; kind: "context" | "dropdown" }) {
  const Item = kind === "context" ? ContextMenuItem : DropdownMenuItem
  const Separator = kind === "context" ? ContextMenuSeparator : DropdownMenuSeparator
  return (
    <>
      {actions.map((action, index) =>
        action === "separator" ? (
          <Separator key={`s${index}`} />
        ) : (
          <Item key={action.key} variant={action.destructive ? "destructive" : "default"} disabled={action.disabled} onSelect={action.onSelect}>
            {action.icon}
            {action.label}
          </Item>
        )
      )}
    </>
  )
}
