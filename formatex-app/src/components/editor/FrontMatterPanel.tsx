import { ChevronDown, Code2, FileCog } from "lucide-react"
import { useTranslation } from "react-i18next"
import { SettingsForm } from "@/components/editor/SettingsForm"
import { Button } from "@/components/ui/button"
import type { FrontMatterProps } from "@/lib/editor/livePreview"
import { YAML_FORMAT } from "@/lib/editor/settingsFormat"
import { cn } from "@/lib/utils"
import { useSchemaStore } from "@/stores/useSchemaStore"
import { useSettingsStore } from "@/stores/useSettingsStore"

/**
 * The front matter of a document (the YAML between `---` lines at the top) as the same settings screen `config.toml` has: the keys of
 * the engine's schema with a control each, written back into the text. It stands in the visual editor in place of the source;
 * the button with the code icon shows the source.
 */
export function FrontMatterPanel({ text, onChange, onSource }: FrontMatterProps) {
  const { t, i18n } = useTranslation()
  const config = useSchemaStore((state) => state.schema.config?.["front-matter"])
  const open = useSettingsStore((state) => state.frontMatterOpen)
  const setOpen = useSettingsStore((state) => state.setFrontMatterOpen)
  if (!config) return null

  return (
    <div dir={i18n.dir()} className="rounded-xl border border-border bg-muted/30 font-sans text-[13px] leading-normal whitespace-normal text-foreground">
      <div className="flex h-9 items-center gap-1 ps-1 pe-1">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-start text-[13px] font-semibold outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90 rtl:rotate-90")} />
          <FileCog className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{t("frontMatter.title")}</span>
        </button>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={onSource} title={t("frontMatter.source")} aria-label={t("frontMatter.source")}>
          <Code2 />
        </Button>
      </div>
      {open && <SettingsForm className="border-t border-border p-2" text={text} onChange={onChange} config={config} format={YAML_FORMAT} search={false} stacked defaultClosed={Object.keys(config.tables)} />}
    </div>
  )
}
