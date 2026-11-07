import { useMemo, useState, type ReactNode } from "react"
import { Check, Copy, FileDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control"
import { Switch } from "@/components/ui/switch"
import { saveBytes } from "@/lib/files/saveFile"
import { COMPONENT_GROUPS, estimateTokens, generateBuilding, generateSkill, generateWriting, SKILL_LEVELS, skillComponents, type SkillLanguage, type SkillLevel, type SkillSection } from "@/lib/skill/generate"
import { cn } from "@/lib/utils"
import { useSchemaStore } from "@/stores/useSchemaStore"

const FILE_NAME = "SKILL.md"

interface SectionCardProps {
  title: string
  section: SkillSection
  onChange: (next: SkillSection) => void
  sizes: Record<SkillLevel, number>
  /** False for the only section that is on: the file keeps one. */
  canTurnOff: boolean
  children?: ReactNode
}

/** One section of the skill: its switch, its size (with the tokens each size takes) and its language. */
function SectionCard({ title, section, onChange, sizes, canTurnOff, children }: SectionCardProps) {
  const { t } = useTranslation()
  const languageOptions: SegmentedOption<SkillLanguage>[] = [
    { value: "en", label: t("skill.languageEn") },
    { value: "fa", label: t("skill.languageFa") },
  ]
  return (
    <section aria-label={title} className={cn("space-y-2.5 rounded-lg border border-border p-2.5", !section.enabled && "bg-muted/40")}>
      <div className="flex h-8 items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-medium">{title}</h2>
        <Switch checked={section.enabled} disabled={section.enabled && !canTurnOff} onCheckedChange={(enabled) => onChange({ ...section, enabled })} aria-label={title} />
      </div>
      {section.enabled && (
        <>
          <div role="radiogroup" aria-label={t("skill.size")} className="grid grid-cols-2 gap-1.5">
            {SKILL_LEVELS.map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={section.level === size}
                onClick={() => onChange({ ...section, level: size })}
                className={cn(
                  "flex min-h-10 flex-col items-start justify-center rounded-lg border px-2.5 py-1.5 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  section.level === size ? "border-primary bg-accent" : "border-border hover:bg-muted"
                )}
              >
                <span className="text-[13px] font-medium">{t(`skill.${size}`)}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{t("skill.tokens", { tokens: sizes[size].toLocaleString() })}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{t(`skill.${section.level}Hint`)}</p>
          <SegmentedControl value={section.language} onValueChange={(language) => onChange({ ...section, language })} options={languageOptions} label={t("skill.language")} compact className="w-full [&>*]:flex-1" />
          {children}
        </>
      )}
    </section>
  )
}

/**
 * The skill of the project for an AI agent: one Markdown file built from the engine's schema and the docs of every component. It has up
 * to two sections, writing documents and building components; each is switched on or off and has its own size and language. The
 * components the writing section describes are chosen too, so a skill can stay small.
 */
export function SkillPage() {
  const { t } = useTranslation()
  const schema = useSchemaStore((state) => state.schema)
  const [writing, setWriting] = useState<SkillSection>({ enabled: true, level: "standard", language: "en" })
  const [building, setBuilding] = useState<SkillSection>({ enabled: false, level: "standard", language: "en" })
  // null = every component; a set once the user picks
  const [chosen, setChosen] = useState<ReadonlySet<string> | null>(null)
  const [copied, setCopied] = useState(false)

  const components = useMemo(() => skillComponents(schema), [schema])
  const selected = chosen ?? new Set(components.map((component) => component.name))

  const writingSizes = useMemo(
    () => Object.fromEntries(SKILL_LEVELS.map((level) => [level, estimateTokens(generateWriting(schema, { level, language: writing.language, components: chosen }))])) as Record<SkillLevel, number>,
    [schema, writing.language, chosen]
  )
  const buildingSizes = useMemo(
    () => Object.fromEntries(SKILL_LEVELS.map((level) => [level, estimateTokens(generateBuilding({ ...building, level }))])) as Record<SkillLevel, number>,
    [building]
  )
  const text = useMemo(() => generateSkill(schema, { writing: { ...writing, components: chosen }, building }), [schema, writing, building, chosen])

  const toggle = (name: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(name)
    else next.delete(name)
    setChosen(next.size === components.length ? null : next)
  }

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
        <aside className="shrink-0 space-y-3 border-b border-border p-3 lg:w-80 lg:overflow-y-auto lg:border-e lg:border-b-0">
          <SectionCard title={t("skill.writing")} section={writing} onChange={setWriting} sizes={writingSizes} canTurnOff={building.enabled}>
            <section aria-label={t("skill.components")} className="space-y-1.5">
              <div className="flex items-center gap-1">
                <h3 className="flex-1 text-xs font-medium text-muted-foreground">
                  {t("skill.components")} <span className="tabular-nums">{selected.size}/{components.length}</span>
                </h3>
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
                    <h4 className="px-1 pt-1.5 text-[11px] font-medium text-muted-foreground">{t(`skill.group.${group}`)}</h4>
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
          </SectionCard>
          <SectionCard title={t("skill.building")} section={building} onChange={setBuilding} sizes={buildingSizes} canTurnOff={writing.enabled} />
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
