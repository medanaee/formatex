import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { ResponsiveDialog } from "@/components/common/ResponsiveDialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CONFIG_FILE, DEFAULT_CONFIG, fileKindOf } from "@/lib/projects"
import { useEditorStore } from "@/stores/useEditorStore"

interface ProjectSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The settings of one project: which Markdown file is typeset, and its `config.toml`, the engine's configuration (theme, page,
 * fonts, ...). The user pastes or edits their own config.toml here; it is the same file that appears in the file tree.
 */
export function ProjectSettingsDialog({ open, onOpenChange }: ProjectSettingsDialogProps) {
  const { t } = useTranslation()
  const files = useEditorStore((state) => state.files)
  const mainFile = useEditorStore((state) => state.mainFile)
  const config = useEditorStore((state) => state.texts[CONFIG_FILE])
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (open) void useEditorStore.getState().load(CONFIG_FILE).catch(() => useEditorStore.getState().edit(CONFIG_FILE, DEFAULT_CONFIG))
  }, [open])

  const markdownFiles = files.filter((entry) => entry.kind === "file" && fileKindOf(entry.path) === "markdown")

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setConfirmReset(false)
        onOpenChange(next)
      }}
      size="lg"
      title={t("projectSettings.title")}
      footer={
        <Button variant="outline" size="lg" onClick={() => { setConfirmReset(false); onOpenChange(false) }}>
          {t("common.close")}
        </Button>
      }
    >
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{t("editor.mainFile")}</span>
          <Select value={mainFile} onValueChange={(value) => useEditorStore.getState().setMainFile(value)}>
            <SelectTrigger className="h-9 w-48 text-xs" dir="ltr">
              <SelectValue />
            </SelectTrigger>
            <SelectContent><SelectGroup>
              {markdownFiles.map((entry) => (
                <SelectItem key={entry.path} value={entry.path} className="text-xs">
                  {entry.path}
                </SelectItem>
              ))}
            </SelectGroup></SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex h-9 items-center justify-between border-b border-border bg-muted/50 ps-3 pe-1">
            <span dir="ltr" className="font-mono text-xs text-muted-foreground">{t("projectSettings.config")}</span>
            {confirmReset ? (
              <span className="flex items-center gap-1 text-xs">
                {t("projectSettings.resetConfirm")}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    useEditorStore.getState().edit(CONFIG_FILE, DEFAULT_CONFIG)
                    setConfirmReset(false)
                  }}
                >
                  {t("projectSettings.reset")}
                </Button>
              </span>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
                <RotateCcw data-icon="inline-start" /> {t("projectSettings.reset")}
              </Button>
            )}
          </div>
          <div className="h-[min(50vh,22rem)]">
            {config !== undefined && (
              <CodeEditor
                path={`dialog:${CONFIG_FILE}`}
                kind="toml"
                value={config}
                placeholder={t("projectSettings.pasteHint")}
                lineNumbers={false}
                onChange={(next) => useEditorStore.getState().edit(CONFIG_FILE, next)}
              />
            )}
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
