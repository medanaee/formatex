import { useEffect, useState } from "react"
import { FileCode, Loader2, RotateCcw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ResponsiveDialog } from "@/components/common/ResponsiveDialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CONFIG_FILE } from "@/lib/projects"
import { DEFAULT_HTML_OPTIONS, htmlOptionsFromConfig, type HtmlExportOptions } from "@/lib/projects/htmlConfig"
import { useEditorStore } from "@/stores/useEditorStore"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"

const close = () => useWorkspaceStore.getState().set({ htmlDialog: false })

interface OptionRowProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint: string
}

/** One switch of the dialog: its name, a line about it, and the switch. */
function OptionRow({ checked, onChange, label, hint }: OptionRowProps) {
  return (
    <label className="flex items-start justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch size="sm" checked={checked} onCheckedChange={onChange} aria-label={label} className="mt-0.5 shrink-0" />
    </label>
  )
}

const ROWS: (keyof HtmlExportOptions)[] = ["toolbar", "progress", "outline", "copyCode", "embedFonts"]

/**
 * The HTML export (an experiment): its settings, then the file. Shown by `useWorkspaceStore.htmlDialog`. Every time it opens, the switches
 * start from the `[html]` table of the project's config.toml; a change here is for this export only (the table is edited in the settings).
 */
export function HtmlExportDialog() {
  const { t } = useTranslation()
  const open = useWorkspaceStore((state) => state.htmlDialog)
  const status = useEditorStore((state) => state.exportStatus)
  const message = useEditorStore((state) => state.exportMessage)
  const working = status === "working"
  const [fromConfig, setFromConfig] = useState<HtmlExportOptions>(DEFAULT_HTML_OPTIONS)
  const [options, setOptions] = useState<HtmlExportOptions>(DEFAULT_HTML_OPTIONS)

  useEffect(() => {
    if (!open) return
    let current = true
    void (async () => {
      const store = useEditorStore.getState()
      const config = store.texts[CONFIG_FILE] ?? (await store.load(CONFIG_FILE).catch(() => ""))
      if (!current) return
      const found = htmlOptionsFromConfig(config)
      setFromConfig(found)
      setOptions(found)
    })()
    return () => {
      current = false
    }
  }, [open])

  const changed = ROWS.some((key) => options[key] !== fromConfig[key])

  // The dialog closes first: the native "Save as" window opens over the app, and a modal dialog still open under it fights it for the focus.
  // The progress and a failure show on the toolbar's export button, as for the PDF.
  const exportNow = () => {
    close()
    void useEditorStore.getState().exportHtml(options)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={t("htmlExport.title")}
      description={t("htmlExport.experimental")}
      footer={
        <>
          {changed && (
            <Button variant="ghost" onClick={() => setOptions(fromConfig)} title={t("htmlExport.fromConfigHint")}>
              <RotateCcw data-icon="inline-start" />
              {t("htmlExport.fromConfig")}
            </Button>
          )}
          <Button variant="outline" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button disabled={working} onClick={exportNow}>
            {working ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <FileCode data-icon="inline-start" />}
            {t("htmlExport.export")}
          </Button>
        </>
      }
    >
      <div className="divide-y divide-border">
        {ROWS.map((key) => (
          <OptionRow key={key} checked={options[key]} onChange={(next) => setOptions((state) => ({ ...state, [key]: next }))} label={t(`htmlExport.${key}`)} hint={t(`htmlExport.${key}Hint`)} />
        ))}
      </div>
      {status === "error" && message && <p className="mt-2 break-words text-xs text-destructive">{t("editor.exportFailed")}: {message}</p>}
    </ResponsiveDialog>
  )
}
