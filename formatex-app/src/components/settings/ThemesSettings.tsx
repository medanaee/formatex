import { useState } from "react"
import { ChevronDown, Copy, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ThemeDots } from "@/components/common/ThemeDots"
import { ColorField } from "@/components/editor/fields"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { BUILTIN_THEME_NAMES, BUILTIN_THEMES, isThemeName, resolveTheme, THEME_COLORS, type CustomTheme, type ThemeColor } from "@/lib/editor/themes"
import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/stores/useSettingsStore"

const COLOR_LABEL = {
  bg: "themes.bg",
  fg: "themes.fg",
  heading: "themes.heading",
  muted: "themes.muted",
  accent: "themes.accent",
  secondary: "themes.secondary",
  rule: "themes.rule",
  "code-bg": "themes.codeBg",
  "code-stroke": "themes.codeStroke",
} as const satisfies Record<ThemeColor, string>

function ThemeCard({ name, theme }: { name: string; theme: CustomTheme }) {
  const { t } = useTranslation()
  const themes = useSettingsStore((state) => state.customThemes)
  const setThemes = useSettingsStore((state) => state.setCustomThemes)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(name)
  const colors = resolveTheme(theme)
  const update = (next: Partial<CustomTheme>) => setThemes({ ...themes, [name]: { ...theme, ...next } })

  const rename = () => {
    const next = draft.trim()
    if (next === name) return
    if (!isThemeName(next) || next in themes) return setDraft(name)
    setThemes(Object.fromEntries(Object.entries(themes).map(([key, value]) => [key === name ? next : key, value])))
  }

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="flex h-9 items-center gap-2 px-2">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={name} className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted">
          <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90 rtl:rotate-90")} />
        </button>
        <ThemeDots colors={colors} />
        <input
          dir="ltr"
          value={draft}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={rename}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          aria-label={t("themes.name")}
          className="h-7 min-w-0 flex-1 rounded border-0 border-b border-transparent bg-transparent px-1 font-mono text-xs outline-none focus:border-foreground"
        />
        <Button variant="ghost" size="icon-xs" className="text-muted-foreground" onClick={() => setThemes(Object.fromEntries(Object.entries(themes).filter(([key]) => key !== name)))} title={t("common.delete")} aria-label={t("common.delete")}>
          <Trash2 />
        </Button>
      </div>
      {open && (
        <div className="grid grid-cols-[6rem_1fr] items-center gap-2 border-t border-border p-2.5 text-xs">
          <span className="text-muted-foreground">{t("themes.base")}</span>
          <Select value={theme.base} onValueChange={(base) => update({ base })}>
            <SelectTrigger className="h-8 text-xs" dir="ltr">
              <SelectValue />
            </SelectTrigger>
            <SelectContent><SelectGroup>
              {BUILTIN_THEME_NAMES.map((item) => (
                <SelectItem key={item} value={item} className="text-xs">
                  {item}
                </SelectItem>
              ))}
            </SelectGroup></SelectContent>
          </Select>
          <span className="text-muted-foreground">{t("themes.dark")}</span>
          <Switch size="sm" checked={theme.dark} onCheckedChange={(dark) => update({ dark })} aria-label={t("themes.dark")} />
          {THEME_COLORS.map((key) => (
            <div key={key} className="contents">
              <span className="text-muted-foreground">{t(COLOR_LABEL[key])}</span>
              <ColorField hexOnly value={colors[key]} onChange={(next) => update({ colors: { ...theme.colors, [key]: next.trim() } })} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The document themes of the user: a name and the colors of a page (text, headings, accent, code, ...). They are kept with the
 * app's settings and added to every project when it is typeset, so any document can name one in `theme` of its config.toml.
 */
export function ThemesSettings() {
  const { t } = useTranslation()
  const themes = useSettingsStore((state) => state.customThemes)
  const setThemes = useSettingsStore((state) => state.setCustomThemes)

  const create = (from: string) => {
    const label = from in BUILTIN_THEMES ? from : "theme"
    let n = 1
    while (`${label}-${n}` in themes) n++
    const base = from in BUILTIN_THEMES ? from : "paper"
    setThemes({ ...themes, [`${label}-${n}`]: { base, dark: BUILTIN_THEMES[base].dark, colors: {} } })
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <h2 className="text-xs font-medium text-muted-foreground">{t("themes.custom")}</h2>
          <Button variant="ghost" size="xs" onClick={() => create("")}>
            <Plus data-icon="inline-start" />
            {t("themes.add")}
          </Button>
        </div>
        <div className="grid gap-1.5">
          {Object.keys(themes).length === 0 && <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">{t("themes.none")}</p>}
          {Object.entries(themes).map(([name, theme]) => (
            <ThemeCard key={name} name={name} theme={theme} />
          ))}
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted-foreground">{t("themes.hint")}</p>
      </section>

      <section>
        <h2 className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">{t("themes.builtin")}</h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-card text-card-foreground">
          {BUILTIN_THEME_NAMES.map((name) => (
            <div key={name} className="flex h-9 items-center gap-2 px-3 text-xs">
              <ThemeDots colors={BUILTIN_THEMES[name]} />
              <span className="min-w-0 flex-1 truncate font-mono">{name}</span>
              <Button variant="ghost" size="icon-xs" className="text-muted-foreground" onClick={() => create(name)} title={t("themes.duplicate")} aria-label={t("themes.duplicate")}>
                <Copy />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
