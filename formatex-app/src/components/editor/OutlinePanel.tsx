import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { parseHeadings } from "@/lib/editor/outline"
import { fileKindOf } from "@/lib/projects"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"

/** The headings of the open Markdown file as a tree; a click puts the editor's cursor on the heading. */
export function OutlinePanel({ onOpen }: { onOpen?: () => void }) {
  const { t } = useTranslation()
  const path = useEditorStore((state) => state.activePath)
  const text = useEditorStore((state) => (path ? state.texts[path] : undefined))
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set())
  const markdown = path !== null && fileKindOf(path) === "markdown"
  const headings = useMemo(() => (markdown && text !== undefined ? parseHeadings(text) : []), [markdown, text])

  if (headings.length === 0) return <p className="p-4 text-center text-xs text-muted-foreground">{markdown ? t("outline.empty") : t("outline.notMarkdown")}</p>

  // A heading is hidden while an enclosing heading (a lower level number before it) is collapsed
  const visible = headings.filter((heading, index) => {
    for (let i = index - 1, level = heading.level; i >= 0; i--) {
      if (headings[i].level < level) {
        if (collapsed.has(headings[i].line)) return false
        level = headings[i].level
      }
    }
    return true
  })
  const top = Math.min(...headings.map((heading) => heading.level))
  const hasChildren = (index: number) => headings[index + 1] !== undefined && headings[index + 1].level > headings[index].level

  return (
    <div className="h-full overflow-y-auto py-1" role="tree" aria-label={t("outline.title")}>
      {visible.map((heading) => {
        const index = headings.indexOf(heading)
        const open = !collapsed.has(heading.line)
        return (
          <div key={heading.line} role="treeitem" aria-expanded={hasChildren(index) ? open : undefined} aria-selected={false} className="group flex h-7 items-center text-xs" style={{ paddingInlineStart: 4 + (heading.level - top) * 12 }}>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden={!hasChildren(index)}
              onClick={() =>
                setCollapsed((current) => {
                  const next = new Set(current)
                  if (!next.delete(heading.line)) next.add(heading.line)
                  return next
                })
              }
              className={cn("flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent", !hasChildren(index) && "invisible")}
            >
              <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90 rtl:rotate-90")} />
            </button>
            <button
              type="button"
              dir="auto"
              title={heading.title}
              onClick={() => {
                if (path) void useEditorStore.getState().revealAt(path, heading.line, 1)
                onOpen?.()
              }}
              className={cn("min-w-0 flex-1 truncate rounded px-1.5 py-1 text-start outline-none hover:bg-sidebar-accent focus-visible:bg-sidebar-accent", heading.level === top ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground")}
            >
              {heading.title || "—"}
            </button>
          </div>
        )
      })}
    </div>
  )
}
