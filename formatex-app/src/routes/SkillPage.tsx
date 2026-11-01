import { useMemo, useState } from "react"
import { Check, Copy, FileDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control"
import { saveBytes } from "@/lib/files/saveFile"
import { COMPONENT_GROUPS, estimateTokens, generateSkill, SKILL_LEVELS, skillComponents, type SkillLanguage, type SkillLevel } from "@/lib/skill/generate"
import { cn } from "@/lib/utils"
import { useSchemaStore } from "@/stores/useSchemaStore"

const FILE_NAME = "SKILL.md"

/**
 * The skill of the project's components for an AI agent: one Markdown file built from the engine's schema and the docs of every
 * component. The size and the language are chosen here, and so are the components, so a skill can stay small.
 */
export function SkillPage() {
  const { t } = useTranslation()
  const schema = useSchemaStore((state) => state.schema)
  const [level, setLevel] = useState<SkillLevel>("standard")
  const [language, setLanguage] = useState<SkillLanguage>("en")
  // null = every component; a set once the user picks
  const [chosen, setChosen] = useState<ReadonlySet<string> | null>(null)
  const [copied, setCopied] = useState(false)

  const components = useMemo(() => skillComponents(schema), [schema])
  const selected = chosen ?? new Set(components.map((component) => component.name))

  const sizes = useMemo(
    () => Object.fromEntries(SKILL_LEVELS.map((size) => [size, estimateTokens(generateSkill(schema, { level: size, language, components: chosen }))])) as Record<SkillLevel, number>,
    [schema, language, chosen]
  )
  const text = useMemo(() => generateSkill(schema, { level, language, components: chosen }), [schema, level, language, chosen])

  const toggle = (name: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(name)
    else next.delete(name)
    setChosen(next.size === components.length ? null : next)
  }

  const languageOptions: SegmentedOption<SkillLanguage>[] = [
    { value: "en", label: t("skill.languageEn") },
    { value: "fa", label: t("skill.languageFa") },
    { value: "both", label: t("skill.languageBoth") },
  ]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // The clipboard can be refused (a browser without permission): the download is still there
    }
  }

  return (
    <>
      <PageHeader
        title={t("skill.title")}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void copy()} title={t("skill.copy")} aria-label={t("skill.copy")}>
              {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
              <span className="hidden sm:inline">{copied ? t("skill.copied") : t("skill.copy")}</span>
            </Button>
            <Button size="sm" onClick={() => void saveBytes(new TextEncoder().encode(text), FILE_NAME, "text/markdown")} title={t("skill.download")} aria-label={t("skill.download")}>
              <FileDown data-icon="inline-start" />
              <span className="hidden sm:inline">{FILE_NAME}</span>
            </Button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <aside className="shrink-0 space-y-4 border-b border-border p-3 lg:w-80 lg:overflow-y-auto lg:border-e lg:border-b-0">
          <section aria-label={t("skill.size")} className="space-y-1.5">
            <h2 className="text-xs font-medium text-muted-foreground">{t("skill.size")}</h2>
            <div role="radiogroup" aria-label={t("skill.size")} className="grid grid-cols-2 gap-1.5">
              {SKILL_LEVELS.map((size) => (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={level === size}
                  onClick={() => setLevel(size)}
                  className={cn(
                    "flex min-h-10 flex-col items-start justify-center rounded-lg border px-2.5 py-1.5 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    level === size ? "border-primary bg-accent" : "border-border hover:bg-muted"
                  )}
                >
                  <span className="text-[13px] font-medium">{t(`skill.${size}`)}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{t("skill.tokens", { tokens: sizes[size].toLocaleString() })}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{t(`skill.${level}Hint`)}</p>
          </section>

          <section aria-label={t("skill.language")} className="space-y-1.5">
            <h2 className="text-xs font-medium text-muted-foreground">{t("skill.language")}</h2>
            <SegmentedControl value={language} onValueChange={setLanguage} options={languageOptions} label={t("skill.language")} compact className="w-full [&>*]:flex-1" />
          </section>

          <section aria-label={t("skill.components")} className="space-y-1.5">
            <div className="flex items-center gap-1">
              <h2 className="flex-1 text-xs font-medium text-muted-foreground">
                {t("skill.components")} <span className="tabular-nums">{selected.size}/{components.length}</span>
              </h2>
              <Button variant="ghost" size="xs" onClick={() => setChosen(null)}>
                {t("skill.all")}
              </Button>
              <Button variant="ghost" size="xs" onClick={() => setChosen(new Set())}>
                {t("skill.none")}
              </Button>
            </div>
            {COMPONENT_GROUPS.map((group) => {
              const members = components.filter((component) => component.group === group)
              if (!members.length) return null
              return (
                <div key={group} className="space-y-0.5">
                  <h3 className="px-1 pt-1.5 text-[11px] font-medium text-muted-foreground">{t(`skill.group.${group}`)}</h3>
                  {members.map((component) => (
                    <label key={component.name} className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 text-[13px] hover:bg-muted">
                      <Checkbox checked={selected.has(component.name)} onCheckedChange={(on) => toggle(component.name, on === true)} />
                      <span className="min-w-0 flex-1 truncate">{component.name}</span>
                      <span dir="ltr" className="max-w-[45%] truncate font-mono text-[11px] text-muted-foreground">
                        {component.tags.slice(0, 3).map((tag) => `<${tag}>`).join(" ")}
                      </span>
                    </label>
                  ))}
                </div>
              )
            })}
          </section>
        </aside>

        <section className="flex min-h-[60dvh] min-w-0 flex-1 flex-col lg:min-h-0">
          <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border px-3 text-[11px] text-muted-foreground tabular-nums">
            <span dir="ltr">{FILE_NAME}</span>
            <span>{t("skill.stats", { chars: text.length.toLocaleString(), tokens: estimateTokens(text).toLocaleString() })}</span>
          </div>
          <pre dir="ltr" className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/90 select-text">
            {text}
          </pre>
        </section>
      </div>
    </>
  )
}
