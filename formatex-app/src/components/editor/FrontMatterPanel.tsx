import { ChevronDown, Code2, FileCog, Import } from "lucide-react"
import { useTranslation } from "react-i18next"
import { SettingsForm } from "@/components/editor/SettingsForm"
import { Button } from "@/components/ui/button"
import { useConfigText } from "@/hooks/useConfigText"
import type { FrontMatterProps } from "@/lib/editor/livePreview"
import { TOML_FORMAT, YAML_FORMAT } from "@/lib/editor/settingsFormat"
import type { ConfigSchema } from "@/lib/editor/schema"
import { cn } from "@/lib/utils"
import { useSchemaStore } from "@/stores/useSchemaStore"
import { useSettingsStore } from "@/stores/useSettingsStore"

/** The settings `config.toml` has that a document can set too, written into the front matter text; what the front matter has already is overwritten. */
function copyFromConfig(frontMatter: string, toml: string, config: ConfigSchema): string {
  let next = frontMatter
  const put = (table: string, key: string) => {
    const value = TOML_FORMAT.get(toml, table, key)
    if (!value || value.kind === "other") return
    next = YAML_FORMAT.set(next, table, key, value.kind === "string" ? YAML_FORMAT.string(value.value) : String(value.value))
  }
  for (const key of Object.keys(config.attrs)) put("", key)
  for (const [table, definition] of Object.entries(config.tables)) for (const key of Object.keys(definition.attrs)) put(table, key)
  return next
}

/**
 * The front matter of a document (the YAML between `---` lines at the top) as the same settings screen `config.toml` has: the keys of
 * the engine's schema with a control each, written back into the text. It stands in the visual editor in place of the source,
 * as a rounded card of its own whose rows inside are flat and flush; the button with the code icon shows the source.
 */
export function FrontMatterPanel({ text, onChange, onSource }: FrontMatterProps) {
  const { t, i18n } = useTranslation()
  const config = useSchemaStore((state) => state.schema.config?.["front-matter"])
  const open = useSettingsStore((state) => state.frontMatterOpen)
  const setOpen = useSettingsStore((state) => state.setFrontMatterOpen)
  const [toml] = useConfigText()
  if (!config) return null

  return (
    <div dir={i18n.dir()} className="overflow-hidden rounded-xl border border-border bg-card font-sans text-[13px] leading-normal whitespace-normal text-card-foreground">
      <div className="flex h-9 items-center gap-1 pe-1">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex h-9 min-w-0 flex-1 items-center gap-2 px-3 text-start text-[13px] font-semibold outline-none hover:bg-muted/50 focus-visible:bg-muted">
          <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90 rtl:rotate-90")} />
          <FileCog className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{t("frontMatter.title")}</span>
        </button>
        <Button variant="ghost" size="icon-sm" disabled={toml === undefined} className="text-muted-foreground" onClick={() => toml !== undefined && onChange(copyFromConfig(text, toml, config))} title={t("frontMatter.copyFromConfig")} aria-label={t("frontMatter.copyFromConfig")}>
          <Import />
        </Button>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={onSource} title={t("frontMatter.source")} aria-label={t("frontMatter.source")}>
          <Code2 />
        </Button>
      </div>
      {open && <SettingsForm className="border-t border-border" text={text} onChange={onChange} config={config} format={YAML_FORMAT} search={false} side flat defaultClosed={Object.keys(config.tables)} />}
    </div>
  )
}
