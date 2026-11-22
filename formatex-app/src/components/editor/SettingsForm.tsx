import { useMemo, useState } from "react"
import { ChevronDown, FileWarning, Plus, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { FileIcon } from "@/components/common/FileIcon"
import { ThemeDots } from "@/components/common/ThemeDots"
import { ColorField, LengthField } from "@/components/editor/fields"
import { OverrideBadge } from "@/components/editor/OverrideInfo"
import { VariablesSection } from "@/components/editor/VariablesSection"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { localized, type AttrSpec, type ConfigSchema } from "@/lib/editor/schema"
import { normalizeComponentFolder, projectComponentFolders, readComponentList, writeComponentList } from "@/lib/editor/componentList"
import type { SettingsFormat } from "@/lib/editor/settingsFormat"
import { overrideFor, type FrontMatterEntry } from "@/lib/editor/overrides"
import { BUILTIN_THEMES, type ThemeColor } from "@/lib/editor/themes"
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
  format: SettingsFormat
  /** Values to offer on top of the schema's (the project's own themes for `theme`). */
  extraValues?: string[]
  files: string[]
}

function Control({ name, spec, current, write, format, extraValues, files }: FieldProps) {
  const { t } = useTranslation()
  const known = useSchemaStore((state) => state.schema.themes)
  const text = (value: string) => write(value === "" ? undefined : { literal: format.string(value) })
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
  if (spec.type === "length") {
    // The page size is written in physical units only (the engine reads mm, cm, in and pt there)
    const page = name === "page-width" || name === "page-height"
    return <LengthField value={current ?? ""} placeholder={spec.default} onChange={text} defaultUnit={page ? "mm" : undefined} units={page ? PAGE_UNITS : undefined} />
  }
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

interface SettingsFormProps {
  /** The file's text (TOML), or the front matter without its `---` lines (YAML). */
  text: string
  onChange: (next: string) => void
  /** The keys: `config.config` or `config["front-matter"]` of the engine's schema. */
  config: ConfigSchema
  format: SettingsFormat
  /** Names of the project's own themes, offered by `theme`. */
  extraThemes?: string[]
  /** The settings the main document sets in its front matter (`config.toml` only): they get an info icon saying the document wins. */
  overrides?: { entries: readonly FrontMatterEntry[]; file: string }
  /** A box to search the keys; off where the form sits inside the text. */
  search?: boolean
  /** Tables that start closed. */
  defaultClosed?: string[]
  /** The control under its name instead of beside it (a narrow place, like the editor). */
  stacked?: boolean
  /** The control beside its name at any width (a narrow place that still wants the table look: a smaller control column). */
  side?: boolean
  /** Sections as plain rows with a line between them, edge to edge, instead of rounded cards. */
  flat?: boolean
  className?: string
}

/** Reads a value as the text the controls show: a string without its quotes, a number or boolean as written. */
function shown(format: SettingsFormat, text: string, table: string, key: string): { value: string | undefined; plain: boolean } {
  const value = format.get(text, table, key)
  if (!value) return { value: undefined, plain: true }
  if (value.kind === "other") return { value: value.value, plain: false }
  return { value: String(value.value), plain: true }
}

/**
 * A settings screen for a file with the engine's settings: every key of the schema with a control of its own type, grouped by table.
 * A change rewrites that one line of the file, keeping the comments; a key that is not set shows the default, and a reset button
 * removes the key again. Keys the schema does not know stay in the source. `config.toml` and the front matter of a document both use it.
 */
const PAGE_UNITS = ["mm", "cm", "in", "pt"] as const

interface ComponentsSectionProps {
  text: string
  onChange: (next: string) => void
  format: SettingsFormat
  /** The project's files, to offer and to tell which listed file is missing. */
  files: string[]
  doc: string
  flat: boolean
}

/**
 * The component files the file lists in `components` (config.toml: for every document; front matter: for this one): each with the
 * tags it gives, a button to take it out, and a menu with the project's other `.typ` files to add. A form the screen cannot rewrite
 * (an array over several lines) is shown as it is.
 */
function ComponentsSection({ text, onChange, format, files, doc, flat }: ComponentsSectionProps) {
  const { t } = useTranslation()
  const info = useSchemaStore((state) => state.schema.components)
  const value = format.get(text, "", "components")
  const listed = readComponentList(value)
  const listedClean = new Set((listed ?? []).map(normalizeComponentFolder))
  const offered = projectComponentFolders(files).filter((folder) => !listedClean.has(folder))
  const write = (paths: string[]) => onChange(paths.length ? format.set(text, "", "components", writeComponentList(paths, format.string)) : format.remove(text, "", "components"))
  const tagsOf = (folder: string): string[] => {
    const manifestPath = `${folder}/manifest.toml`
    return Object.values(info ?? {})
      .filter((component) => component.file === manifestPath || component.file === folder)
      .flatMap((component) => component.tags)
  }

  return (
    <section className={flat ? "border-b border-border last:border-b-0" : "mb-3 rounded-xl border border-border bg-card text-card-foreground"}>
      <div className="flex h-9 items-center gap-2 px-3 text-[13px] font-semibold">
        <span className="min-w-0 flex-1 truncate">{t("config.components")}</span>
        {listed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" title={t("config.addComponent")} aria-label={t("config.addComponent")}>
                <Plus />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 min-w-48">
              {offered.length === 0 && <DropdownMenuItem disabled>{t("config.noComponentFiles")}</DropdownMenuItem>}
              {offered.map((folder) => (
                <DropdownMenuItem key={folder} onSelect={() => write([...(listed ?? []), folder])}>
                  <FileIcon path={folder} kind="dir" size={16} />
                  <span dir="ltr" className="truncate">{folder}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className={cn("divide-y divide-border border-t border-border", flat && "bg-muted/20")}>
        <p dir="auto" className="px-3 py-2 text-[11px] leading-snug text-muted-foreground">{doc}</p>
        {listed === null && (
          <code dir="ltr" className="m-3 block truncate rounded bg-muted px-2 py-1.5 font-mono text-[11px]" title={t("config.componentsRaw")}>
            {value?.kind === "other" ? value.value : ""}
          </code>
        )}
        {listed?.map((path) => {
          const clean = normalizeComponentFolder(path)
          const missing = !files.some((f) => normalizeComponentFolder(f) === `${clean}/manifest.toml`)
          const tags = tagsOf(clean)
          return (
            <div key={path} className="flex min-h-9 items-center gap-2 px-3 py-1">
              {missing ? <FileWarning className="size-4 shrink-0 text-destructive" aria-label={t("config.componentMissing")} /> : <FileIcon path={clean} kind="dir" size={16} />}
              <div className="min-w-0 flex-1">
                <div dir="ltr" className={cn("truncate font-mono text-xs", missing && "text-destructive")} title={missing ? t("config.componentMissing") : path}>
                  {path}
                </div>
                {tags.length > 0 && (
                  <div dir="ltr" className="truncate font-mono text-[11px] text-muted-foreground">
                    {tags.map((tag) => `<${tag}>`).join(" ")}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon-xs" className="shrink-0 text-muted-foreground" onClick={() => write((listed ?? []).filter((other) => other !== path))} title={t("config.removeComponent")} aria-label={t("config.removeComponent")}>
                <X />
              </Button>
            </div>
          )
        })}
        {listed?.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">{t("config.noComponents")}</p>}
      </div>
    </section>
  )
}

export function SettingsForm({ text, onChange, config, format, extraThemes, overrides, search = true, defaultClosed, stacked = false, side = false, flat = false, className }: SettingsFormProps) {
  const { t, i18n } = useTranslation()
  const entries = useEditorStore((state) => state.files)
  const [query, setQuery] = useState("")
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set(defaultClosed))
  const [openOverrides, setOpenOverrides] = useState<ReadonlySet<string>>(() => new Set())
  const files = useMemo(() => entries.filter((entry) => entry.kind === "file").map((entry) => entry.path), [entries])

  const needle = query.trim().toLowerCase()
  const matches = (name: string, spec: AttrSpec) => needle === "" || name.toLowerCase().includes(needle) || localized(spec.doc, i18n.language).toLowerCase().includes(needle)

  // Hide backend duplicate tables (`html.<base>`, `typ.<base>`) when `<base>` is a shared table
  const sections = [
    { id: "", attrs: config.attrs, doc: undefined as string | undefined },
    ...Object.entries(config.tables)
      .filter(([id]) => {
        const m = /^(?:html|typ)\.(.+)$/.exec(id)
        return !(m && m[1] in config.tables)
      })
      .map(([id, table]) => ({ id, attrs: table.attrs, doc: localized(table.doc, i18n.language) })),
  ]

  const overrideHint = i18n.language === "fa" ? "تنظیم جداگانه برای PDF / HTML" : "Separate override for PDF / HTML"

  return (
    <div className={className}>
      {search && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute start-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("config.search")} aria-label={t("config.search")} className="h-8 ps-8 text-xs" />
        </div>
      )}

      {(() => {
        // The component files have a section of their own, so the plain row is left out of the general keys
        const spec = config.attrs.components
        if (!spec || !matches("components", spec)) return null
        return <ComponentsSection key="components" text={text} onChange={onChange} format={format} files={files} doc={localized(spec.doc, i18n.language)} flat={flat} />
      })()}

      {(() => {
        // The variables too: a list with a control for each, not a row
        const spec = config.attrs.vars
        if (!spec || !(matches("vars", spec) || "variables".includes(needle))) return null
        return <VariablesSection key="vars" text={text} onChange={onChange} format={format} files={files} doc={localized(spec.doc, i18n.language)} flat={flat} />
      })()}

      {sections.map(({ id, attrs, doc }) => {
        const isBackendRoot = id === "html" || id === "typ"
        const typTable = !isBackendRoot && !id.startsWith("typ.") && !id.startsWith("html.") ? (id ? `typ.${id}` : "typ") : undefined
        const htmlTable = !isBackendRoot && !id.startsWith("typ.") && !id.startsWith("html.") ? (id ? `html.${id}` : "html") : undefined
        const typTableAttrs = typTable ? config.tables[typTable]?.attrs : undefined
        const htmlTableAttrs = htmlTable ? config.tables[htmlTable]?.attrs : undefined

        interface RowItem {
          name: string
          spec: AttrSpec
          targetTable: string
          badge?: "typ" | "html"
          typSpec?: AttrSpec
          htmlSpec?: AttrSpec
        }

        const rows: RowItem[] = []
        for (const [name, spec] of Object.entries(attrs)) {
          if (id === "" && (name === "components" || name === "vars" || name === "var-types")) continue
          // Skip shared general attributes repeated inside [html] and [typ]
          if (isBackendRoot && name in config.attrs) continue
          if (!matches(name, spec)) continue
          rows.push({
            name,
            spec,
            targetTable: id,
            typSpec: typTableAttrs?.[name],
            htmlSpec: htmlTableAttrs?.[name],
          })
        }

        // Include backend-exclusive keys from hidden `typ.<id>` / `html.<id>` tables (e.g. `copy-button` in `html.code`)
        if (id !== "") {
          if (typTable && typTableAttrs) {
            for (const [name, spec] of Object.entries(typTableAttrs)) {
              if (name in attrs || !matches(name, spec)) continue
              rows.push({ name, spec, targetTable: typTable, badge: "typ" })
            }
          }
          if (htmlTable && htmlTableAttrs) {
            for (const [name, spec] of Object.entries(htmlTableAttrs)) {
              if (name in attrs || !matches(name, spec)) continue
              rows.push({ name, spec, targetTable: htmlTable, badge: "html" })
            }
          }
        }

        if (rows.length === 0) return null
        const open = needle !== "" || !closed.has(id)
        return (
          <section key={id || "general"} className={flat ? "border-b border-border last:border-b-0" : "mb-3 rounded-xl border border-border bg-card text-card-foreground"}>
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
              className={cn("flex h-9 w-full items-center gap-2 px-3 text-start text-[13px] font-semibold outline-none focus-visible:bg-muted", flat && "hover:bg-muted/50")}
            >
              <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90 rtl:rotate-90")} />
              <span dir="ltr">{id || t("config.general")}</span>
              {doc && <span className="min-w-0 flex-1 truncate text-xs font-normal text-muted-foreground">{doc}</span>}
            </button>
            {open && (
              <div className={cn("divide-y divide-border border-t border-border", flat && "bg-muted/20")}>
                {rows.map(({ name, spec, targetTable, badge, typSpec, htmlSpec }) => {
                  const rowKey = `${targetTable}.${name}`
                  const { value, plain } = shown(format, text, targetTable, name)
                  const overridden = overrides && overrideFor(overrides.entries, targetTable ? `${targetTable}.${name}` : name)
                  const canOverride = Boolean(typSpec || htmlSpec)
                  const typState = typSpec && typTable ? shown(format, text, typTable, name) : undefined
                  const htmlState = htmlSpec && htmlTable ? shown(format, text, htmlTable, name) : undefined
                  const hasBackendOverride = typState?.value !== undefined || htmlState?.value !== undefined
                  const showOverrides = canOverride && (openOverrides.has(rowKey) || hasBackendOverride)

                  return (
                    <div key={rowKey} className="px-3 py-2">
                      <div className={cn("grid gap-1.5", side ? "grid-cols-[minmax(0,1fr)_minmax(0,9.5rem)] items-center gap-3" : !stacked && "sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)] sm:items-center sm:gap-3")}>
                        <div className="min-w-0">
                          <div dir="ltr" className="flex items-center gap-1.5 font-mono text-xs font-medium">
                            {overridden && overrides && <OverrideBadge entry={overridden} file={overrides.file} className="-ms-1" />}
                            <span className={cn(value === undefined && !hasBackendOverride && "text-muted-foreground")}>{name}</span>
                            {badge && <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">{badge}</span>}
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
                                format={format}
                                extraValues={name === "theme" && targetTable === "" ? extraThemes : undefined}
                                write={(next) => onChange(next ? format.set(text, targetTable, name, next.literal) : format.remove(text, targetTable, name))}
                              />
                            ) : (
                              <code dir="ltr" className="block truncate rounded bg-muted px-2 py-1.5 font-mono text-[11px]" title={value}>
                                {value}
                              </code>
                            )}
                          </div>
                          {canOverride && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className={cn("shrink-0", showOverrides || hasBackendOverride ? "text-primary" : "text-muted-foreground opacity-65 hover:opacity-100")}
                              aria-pressed={showOverrides}
                              onClick={() =>
                                setOpenOverrides((current) => {
                                  const next = new Set(current)
                                  if (!next.delete(rowKey)) next.add(rowKey)
                                  return next
                                })
                              }
                              title={overrideHint}
                              aria-label={overrideHint}
                            >
                              <SlidersHorizontal className="size-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-xs" disabled={value === undefined} className={cn("shrink-0 text-muted-foreground", value === undefined && "invisible")} onClick={() => onChange(format.remove(text, targetTable, name))} title={t("config.reset")} aria-label={t("config.reset")}>
                            <RotateCcw />
                          </Button>
                        </div>
                      </div>

                      {showOverrides && (
                        <div className="mt-2 grid gap-1.5 rounded-lg border border-border/70 bg-muted/30 p-2">
                          {([
                            { label: "PDF (typ)", table: typTable, bSpec: typSpec, state: typState },
                            { label: "HTML (html)", table: htmlTable, bSpec: htmlSpec, state: htmlState },
                          ] as const).map(({ label, table, bSpec, state }) => {
                            if (!bSpec || !table || !state) return null
                            const inheritedSpec: AttrSpec = { ...bSpec, default: value ?? spec.default }
                            const subOverridden = overrides && overrideFor(overrides.entries, `${table}.${name}`)
                            return (
                              <div key={table} className={cn("grid gap-1.5", side ? "grid-cols-[minmax(0,1fr)_minmax(0,9.5rem)] items-center gap-2" : !stacked && "sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)] sm:items-center sm:gap-2")}>
                                <div dir="ltr" className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                                  {subOverridden && overrides && <OverrideBadge entry={subOverridden} file={overrides.file} className="-ms-1" />}
                                  <span>{label}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="min-w-0 flex-1">
                                    {state.plain ? (
                                      <Control
                                        name={name}
                                        spec={inheritedSpec}
                                        current={state.value}
                                        files={files}
                                        format={format}
                                        extraValues={name === "theme" ? extraThemes : undefined}
                                        write={(next) => onChange(next ? format.set(text, table, name, next.literal) : format.remove(text, table, name))}
                                      />
                                    ) : (
                                      <code dir="ltr" className="block truncate rounded bg-muted px-2 py-1.5 font-mono text-[11px]" title={state.value}>
                                        {state.value}
                                      </code>
                                    )}
                                  </div>
                                  <Button variant="ghost" size="icon-xs" disabled={state.value === undefined} className={cn("shrink-0 text-muted-foreground", state.value === undefined && "invisible")} onClick={() => onChange(format.remove(text, table, name))} title={t("config.reset")} aria-label={t("config.reset")}>
                                    <RotateCcw />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
