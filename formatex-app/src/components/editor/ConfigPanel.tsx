import { useMemo, useState } from "react"
import { ChevronDown, RotateCcw, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ColorField, LengthField } from "@/components/editor/fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeDots } from "@/components/common/ThemeDots"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useConfigText } from "@/hooks/useConfigText"
import { BUILTIN_THEMES, type ThemeColor } from "@/lib/editor/themes"
import { localized, type AttrSpec } from "@/lib/editor/schema"
import { getValue, removeKey, setValue, tableNames, tomlString } from "@/lib/editor/tomlEdit"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"
import { useSchemaStore } from "@/stores/useSchemaStore"

const UNSET = "__unset__"

/** The colors of a theme by name: the schema has every theme the compiler knows, the user's included (a project's own `[themes.x]` shows none). */
const themeColors = (name: string, known: Record<string, unknown> | undefined): Partial<Record<ThemeColor, string>> => (known?.[name] ?? BUILTIN_THEMES[name] ?? {}) as Partial<Record<ThemeColor, string>>

interface FieldProps {
  name: string
  spec: AttrSpec
  /** The value written in the file as text, or `undefined` when the key is not there. */
  current: string | undefined
  /** `undefined` removes the key. */
  write: (value: { literal: string } | undefined) => void
  /** Values to offer on top of the schema's (the user's own themes for `theme`). */
  extraValues?: string[]
  files: string[]
}

function Control({ name, spec, current, write, extraValues, files }: FieldProps) {
  const { t } = useTranslation()
  const known = useSchemaStore((state) => state.schema.themes)
  const text = (value: string) => write(value === "" ? undefined : { literal: tomlString(value) })
  const choose = (values: string[]) => (
    <Select value={current ?? UNSET} onValueChange={(next) => text(next === UNSET ? "" : next)}>
      <SelectTrigger className="h-8 w-full text-xs" dir="ltr">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={UNSET} className="text-xs text-muted-foreground">
            {spec.default ? `${t("options.default")}: ${spec.default}` : t("options.unset")}
          </SelectItem>
          {values.map((item) => (
            <SelectItem key={item} value={item} className="text-xs">
              {item}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )

  if (name === "theme" && spec.type === "enum") {
    // The schema lists every theme the compiler knows: the engine's, then the user's (and the project's own `[themes.x]`)
    const builtin = (spec.values ?? []).filter((value) => value in BUILTIN_THEMES)
    const own = [...new Set([...(spec.values ?? []).filter((value) => !(value in BUILTIN_THEMES)), ...(extraValues ?? [])])]
    const item = (value: string) => (
      <SelectItem key={value} value={value} className="text-xs">
        <ThemeDots colors={themeColors(value, known)} />
        {value}
      </SelectItem>
    )
    return (
      <Select value={current ?? UNSET} onValueChange={(next) => text(next === UNSET ? "" : next)}>
        <SelectTrigger className="h-8 w-full text-xs" dir="ltr">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={UNSET} className="text-xs text-muted-foreground">
              {spec.default ? `${t("options.default")}: ${spec.default}` : t("options.unset")}
            </SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t("themes.builtin")}</SelectLabel>
            {builtin.map(item)}
          </SelectGroup>
          {own.length > 0 && (
            <SelectGroup>
              <SelectLabel>{t("themes.custom")}</SelectLabel>
              {own.map(item)}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    )
  }
  if (spec.type === "enum" && spec.values) return choose([...spec.values, ...(extraValues ?? [])])
  if (spec.type === "bool") {
    const on = (current ?? spec.default) === "true"
    return <Switch checked={on} onCheckedChange={(next) => write({ literal: String(next) })} aria-label={name} className={cn(current === undefined && "opacity-60")} />
  }
  if (spec.type === "path") return choose([...files].sort((a, b) => a.localeCompare(b)))
  if (spec.type === "color") return <ColorField value={current ?? ""} placeholder={spec.default} onChange={text} />
  if (spec.type === "length") return <LengthField value={current ?? ""} placeholder={spec.default} onChange={text} />
  if (spec.type === "int" || spec.type === "number") {
    return (
      <Input
        dir="ltr"
        inputMode="decimal"
        value={current ?? ""}
        placeholder={spec.default}
        aria-label={name}
        onChange={(event) => {
          const next = event.target.value.trim().replace(",", ".")
          if (next === "") write(undefined)
          else if (/^-?\d+(\.\d+)?$/.test(next)) write({ literal: next })
        }}
        className="h-8 text-xs"
      />
    )
  }
  return <Input dir="auto" value={current ?? ""} placeholder={spec.default} aria-label={name} onChange={(event) => text(event.target.value)} className="h-8 text-xs" />
}

/** Reads a value as the text the controls show: a string without its quotes, a number or boolean as written. */
function shown(text: string, table: string, key: string): { value: string | undefined; plain: boolean } {
  const value = getValue(text, table, key)
  if (!value) return { value: undefined, plain: true }
  if (value.kind === "other") return { value: value.value, plain: false }
  return { value: String(value.value), plain: true }
}

/**
 * `config.toml` as a settings screen: every key of the engine's schema (`engine/tags.json` → `config`) with a control of its own
 * type, grouped by table. A change rewrites that one line of the file, keeping the comments; a key that is not set shows the
 * default, and a reset button removes the key again. Keys the schema does not know stay in the source.
 */
export function ConfigPanel() {
  const { t, i18n } = useTranslation()
  const [text, setText] = useConfigText()
  const schema = useSchemaStore((state) => state.schema)
  const entries = useEditorStore((state) => state.files)
  const [query, setQuery] = useState("")
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set())
  const files = useMemo(() => entries.filter((entry) => entry.kind === "file").map((entry) => entry.path), [entries])
  const config = schema.config?.config

  if (text === undefined || !config) return null
  const themes = tableNames(text, "themes")
  const needle = query.trim().toLowerCase()
  const matches = (name: string, spec: AttrSpec) => needle === "" || name.toLowerCase().includes(needle) || localized(spec.doc, i18n.language).toLowerCase().includes(needle)

  const sections = [{ id: "", attrs: config.attrs, doc: undefined as string | undefined }, ...Object.entries(config.tables).map(([id, table]) => ({ id, attrs: table.attrs, doc: localized(table.doc, i18n.language) }))]

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl p-3 pb-8">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute start-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("config.search")} aria-label={t("config.search")} className="h-8 ps-8 text-xs" />
        </div>

        {sections.map(({ id, attrs, doc }) => {
          const keys = Object.entries(attrs).filter(([name, spec]) => matches(name, spec))
          if (keys.length === 0) return null
          const open = needle !== "" || !closed.has(id)
          return (
            <section key={id || "general"} className="mb-3 rounded-xl border border-border bg-card text-card-foreground">
              <button
                type="button"
                onClick={() =>
                  setClosed((current) => {
                    const next = new Set(current)
                    if (!next.delete(id)) next.add(id)
                    return next
                  })
                }
                aria-expanded={open}
                className="flex h-9 w-full items-center gap-2 px-3 text-start text-[13px] font-semibold outline-none focus-visible:bg-muted"
              >
                <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90 rtl:rotate-90")} />
                <span dir="ltr">{id || t("config.general")}</span>
                {doc && <span className="min-w-0 flex-1 truncate text-xs font-normal text-muted-foreground">{doc}</span>}
              </button>
              {open && (
                <div className="divide-y divide-border border-t border-border">
                  {keys.map(([name, spec]) => {
                    const { value, plain } = shown(text, id, name)
                    return (
                      <div key={name} className="grid gap-1.5 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)] sm:items-center sm:gap-3">
                        <div className="min-w-0">
                          <div dir="ltr" className="flex items-center gap-1 font-mono text-xs font-medium">
                            <span className={cn(value === undefined && "text-muted-foreground")}>{name}</span>
                          </div>
                          <div dir="auto" className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                            {localized(spec.doc, i18n.language)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="min-w-0 flex-1">
                            {plain ? (
                              <Control
                                name={name}
                                spec={spec}
                                current={value}
                                files={files}
                                extraValues={name === "theme" && id === "" ? themes : undefined}
                                write={(next) => setText(next ? setValue(text, id, name, next.literal) : removeKey(text, id, name))}
                              />
                            ) : (
                              <code dir="ltr" className="block truncate rounded bg-muted px-2 py-1.5 font-mono text-[11px]" title={value}>
                                {value}
                              </code>
                            )}
                          </div>
                          <Button variant="ghost" size="icon-xs" disabled={value === undefined} className={cn("shrink-0 text-muted-foreground", value === undefined && "invisible")} onClick={() => setText(removeKey(text, id, name))} title={t("config.reset")} aria-label={t("config.reset")}>
                            <RotateCcw />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
