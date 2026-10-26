import { Folder, ListTree, Tags } from "lucide-react"
import { useTranslation } from "react-i18next"
import { FileTree } from "@/components/editor/FileTree"
import { OutlinePanel } from "@/components/editor/OutlinePanel"
import { TagPalette } from "@/components/editor/TagPalette"
import { cn } from "@/lib/utils"
import { useSettingsStore, type SidebarTab } from "@/stores/useSettingsStore"

/** The panel at the start edge of the editor, with a tab on top: the project's files, the headings or the tag palette. */
export function EditorSidebar({ onOpen }: { /** Called after a file is opened or a tag is inserted (a phone closes the panel). */ onOpen?: () => void }) {
  const { t } = useTranslation()
  const tab = useSettingsStore((state) => state.sidebarTab)
  const setTab = useSettingsStore((state) => state.setSidebarTab)

  const tabs = [
    { id: "files" as const, label: t("editor.files"), Icon: Folder },
    { id: "outline" as const, label: t("outline.title"), Icon: ListTree },
    { id: "tags" as const, label: t("tags.title"), Icon: Tags },
  ] satisfies { id: SidebarTab; label: string; Icon: typeof Folder }[]

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div role="tablist" className="flex h-9 shrink-0 border-b border-sidebar-border select-none">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-label={label}
            title={label}
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center border-b-2 outline-none transition-colors focus-visible:bg-sidebar-accent",
              tab === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {tab === "files" && <FileTree onOpen={onOpen} />}
        {tab === "outline" && <OutlinePanel onOpen={onOpen} />}
        {tab === "tags" && <TagPalette onInsert={onOpen} />}
      </div>
    </div>
  )
}
