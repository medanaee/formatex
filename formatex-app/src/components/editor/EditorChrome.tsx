import { openSearchPanel } from "@codemirror/search"
import { redo, selectAll, undo } from "@codemirror/commands"
import { useNavigate } from "@tanstack/react-router"
import { Eye, FileCode2, PanelRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useFormFactor } from "@/hooks/useFormFactor"
import { openProjectSettings } from "@/lib/editor/openSettings"
import { copySelection, cutSelection, pasteClipboard } from "@/lib/editor/clipboard"
import { stepZoom } from "@/lib/previewZoom"
import { desktopOs } from "@/lib/platform"
import { canUseFolders, revealFolder } from "@/lib/projects/storageMode"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"
import { useEditorViewStore } from "@/stores/useEditorViewStore"
import { useLibraryStore } from "@/stores/useLibraryStore"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"

const trigger = "h-6 rounded px-2 text-xs font-normal text-foreground outline-none hover:bg-muted focus-visible:bg-muted data-[state=open]:bg-muted"

/** File / Edit / View, as text buttons after the project's name. */
export function EditorMenus() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const view = useEditorViewStore((state) => state.view)
  const canUndo = useEditorViewStore((state) => state.canUndo)
  const canRedo = useEditorViewStore((state) => state.canRedo)
  const exporting = useEditorStore((state) => state.exportStatus) === "working"
  const projectId = useEditorStore((state) => state.projectId)
  const location = useLibraryStore((state) => state.documents.find((doc) => doc.id === projectId)?.location) ?? null
  const panels = useSettingsStore((state) => state.panels)
  const setPanel = useSettingsStore((state) => state.setPanel)
  const visualEditor = useSettingsStore((state) => state.visualEditor)
  const setVisualEditor = useSettingsStore((state) => state.setVisualEditor)
  const shown = useWorkspaceStore((state) => state.previewShown)
  const setZoom = useSettingsStore((state) => state.setPreviewZoom)
  const mod = desktopOs() === "macos" ? "⌘" : "Ctrl+"
  const keepFocus = { onCloseAutoFocus: (event: Event) => event.preventDefault() }
  const run = (command: (target: NonNullable<typeof view>) => unknown) => () => {
    if (!view) return
    command(view)
    view.focus()
  }

  return (
    <div className="flex items-center gap-0.5">
      <DropdownMenu>
        <DropdownMenuTrigger className={trigger}>{t("appMenu.file")}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56" {...keepFocus}>
          <DropdownMenuItem onSelect={() => void openProjectSettings()}>{t("editor.settings")}</DropdownMenuItem>
          <DropdownMenuItem disabled={exporting} onSelect={() => void useEditorStore.getState().exportPdf()}>
            {t("editor.export")}
          </DropdownMenuItem>
          {canUseFolders() && (
            <>
              <DropdownMenuSeparator />
              {location ? (
                <>
                  <DropdownMenuItem onSelect={() => useWorkspaceStore.getState().set({ storageDialog: "toLocal" })}>{t("storage.menuToLocal")}</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void revealFolder(location)}>{t("storage.menuShow")}</DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onSelect={() => useWorkspaceStore.getState().set({ storageDialog: "toFolder" })}>{t("storage.menuToFolder")}</DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void navigate({ to: "/" })}>{t("appMenu.close")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={trigger}>{t("appMenu.edit")}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56" {...keepFocus}>
          <DropdownMenuItem disabled={!canUndo} onSelect={run(undo)}>
            {t("format.undo")} <DropdownMenuShortcut>{mod}Z</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canRedo} onSelect={run(redo)}>
            {t("format.redo")} <DropdownMenuShortcut>{mod}Y</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!view} onSelect={() => void (view && cutSelection(view))}>
            {t("menu.cut")} <DropdownMenuShortcut>{mod}X</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!view} onSelect={() => void (view && copySelection(view))}>
            {t("menu.copy")} <DropdownMenuShortcut>{mod}C</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!view} onSelect={() => void (view && pasteClipboard(view))}>
            {t("menu.paste")} <DropdownMenuShortcut>{mod}V</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!view} onSelect={run(selectAll)}>
            {t("menu.selectAll")} <DropdownMenuShortcut>{mod}A</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!view} onSelect={run(openSearchPanel)}>
            {t("appMenu.find")} <DropdownMenuShortcut>{mod}F</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={trigger}>{t("appMenu.view")}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56" {...keepFocus}>
          <DropdownMenuCheckboxItem checked={panels.side} onCheckedChange={(on) => setPanel("side", on)}>
            {t("panels.side")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={panels.editor} onCheckedChange={(on) => setPanel("editor", on)}>
            {t("panels.editor")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={panels.preview} onCheckedChange={(on) => setPanel("preview", on)}>
            {t("panels.preview")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={visualEditor} onCheckedChange={setVisualEditor}>
            {t("appMenu.visual")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => stepZoom(1)}>
            {t("preview.zoomIn")} <DropdownMenuShortcut>{Math.round(shown)}%</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => stepZoom(-1)}>{t("preview.zoomOut")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setZoom("width")}>{t("preview.fitWidth")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/**
 * Three switches: the side panel (files, outline, tags), the editor and the preview. A wide window shows any of them side by side;
 * a narrow one shows the editor or the preview, and the files as a panel over them.
 */
export function PanelToggles({ className }: { className?: string }) {
  const { t } = useTranslation()
  const wide = useFormFactor() === "desktop"
  const panels = useSettingsStore((state) => state.panels)
  const setPanel = useSettingsStore((state) => state.setPanel)
  const tab = useWorkspaceStore((state) => state.tab)
  const filesSheet = useWorkspaceStore((state) => state.filesSheet)
  const set = useWorkspaceStore((state) => state.set)

  const items = [
    { id: "side", icon: PanelRight, label: t("panels.side"), on: wide ? panels.side : filesSheet, toggle: () => (wide ? setPanel("side", !panels.side) : set({ filesSheet: !filesSheet })), locked: false },
    { id: "editor", icon: FileCode2, label: t("panels.editor"), on: wide ? panels.editor : tab === "edit", toggle: () => (wide ? setPanel("editor", !panels.editor) : set({ tab: "edit" })), locked: wide && panels.editor && !panels.preview },
    { id: "preview", icon: Eye, label: t("panels.preview"), on: wide ? panels.preview : tab === "preview", toggle: () => (wide ? setPanel("preview", !panels.preview) : set({ tab: "preview" })), locked: wide && panels.preview && !panels.editor },
  ]
  return (
    <div dir="ltr" className={cn("flex items-center gap-0.5", className)} role="group" aria-label={t("panels.title")}>
      {items.map(({ id, icon: Icon, label, on, toggle, locked }) => (
        <Button key={id} variant="ghost" size="icon-xs" aria-pressed={on} disabled={locked} onClick={toggle} title={label} aria-label={label} className={cn(on ? "bg-muted text-foreground" : "text-muted-foreground")}>
          <Icon />
        </Button>
      ))}
    </div>
  )
}
