import { useMemo, useState, type DragEvent } from "react"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { insertTag, TAG_DRAG_TYPE } from "@/lib/editor/insertTag"
import { localized } from "@/lib/editor/schema"
import { tagIcon } from "@/lib/editor/tagIcons"
import { fileKindOf } from "@/lib/projects"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"
import { useEditorViewStore } from "@/stores/useEditorViewStore"
import { useSchemaStore } from "@/stores/useSchemaStore"

/**
 * Every tag of the engine and of the user's components as a tile: an icon and the name below it. Drag a tile into the editor
 * (source or visual) to write the tag where you drop it; a click (or a tap) writes it at the cursor.
 * Tags that only make sense inside another one (`<item>` in `<grid>`) are not here: they are suggested inside their parent.
 */
export function TagPalette({ onInsert }: { /** Called after a tag was inserted by a click (a phone closes the panel). */ onInsert?: () => void }) {
  const { t, i18n } = useTranslation()
  const schema = useSchemaStore((state) => state.schema)
  const view = useEditorViewStore((state) => state.view)
  const activePath = useEditorStore((state) => state.activePath)
  const [query, setQuery] = useState("")

  const markdown = !!activePath && fileKindOf(activePath) === "markdown"
  const tags = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return Object.entries(schema.tags)
      .filter(([name, spec]) => !spec.scoped && (!needle || name.includes(needle) || (spec.description.en ?? "").toLowerCase().includes(needle) || (spec.description.fa ?? "").includes(needle)))
      .sort(([a], [b]) => a.localeCompare(b))
  }, [schema, query])

  const dragStart = (event: DragEvent, name: string) => {
    event.dataTransfer.setData(TAG_DRAG_TYPE, name)
    event.dataTransfer.effectAllowed = "copy"
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground select-none">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("tags.search")}
          aria-label={t("tags.search")}
          dir="auto"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        />
      </div>
      <ul className="grid min-h-0 flex-1 grid-cols-3 content-start gap-1 overflow-y-auto p-2" role="list">
        {tags.length === 0 && <li className="col-span-3 p-4 text-center text-xs text-muted-foreground">{t("tags.empty")}</li>}
        {tags.map(([name, spec]) => {
          const Icon = tagIcon(name)
          return (
            <li key={name}>
              <button
                type="button"
                draggable
                disabled={!markdown && !view}
                onDragStart={(event) => dragStart(event, name)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const current = useEditorViewStore.getState().view
                  if (current && insertTag(current, name, schema)) onInsert?.()
                }}
                title={`<${name}>  ${localized(spec.description, i18n.language)}`}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] outline-none transition-colors",
                  "hover:bg-sidebar-accent focus-visible:bg-sidebar-accent disabled:opacity-40"
                )}
              >
                <Icon className="size-5 text-muted-foreground" />
                <span dir="ltr" className="max-w-full truncate">{name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
