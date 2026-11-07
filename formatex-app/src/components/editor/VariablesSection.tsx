import { useState } from "react"
import { Check, ListChecks, Plus, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { isBoolean, isNumeric, isVariableName, readTomlVariables, readYamlVariables, ruleLiteral, valueLiteral, VARIABLE_TYPES, type VariableRule, type VariableSpec } from "@/lib/editor/variables"
import { TOML_FORMAT, type SettingsFormat } from "@/lib/editor/settingsFormat"
import { cn } from "@/lib/utils"

interface VariablesSectionProps {
  text: string
  onChange: (next: string) => void
  format: SettingsFormat
  /** The project's files, for the variables that hold a data file. */
  files: string[]
  /** What `vars` is for, from the schema. */
  doc: string
  flat: boolean
}

const DATA_FILE = /\.(json|ya?ml|toml|csv)$/i
const AUTO = "__auto__"

/** The value of a variable with the control of its kind: a menu when it lists its values, a switch for true / false, a file for data. */
function ValueControl({ spec, files, write }: { spec: VariableSpec; files: string[]; write: (value: string, quoted?: boolean) => void }) {
  const value = spec.value ?? ""
  const rule = spec.rule
  if (rule?.kind === "enum") {
    return (
      <Select value={rule.options.includes(value) ? value : ""} onValueChange={(next) => write(next, false)}>
        <SelectTrigger className="h-8 w-full text-xs" dir="ltr">
          <SelectValue placeholder={value || "-"} />
        </SelectTrigger>
        <SelectContent>
          {rule.options.map((item) => (
            <SelectItem key={item} value={item} className="text-xs">
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  if (rule?.kind === "type" && rule.name === "json") {
    const data = files.filter((path) => DATA_FILE.test(path)).sort((a, b) => a.localeCompare(b))
    return (
      <Select value={data.includes(value) ? value : ""} onValueChange={(next) => write(next, true)}>
        <SelectTrigger className="h-8 w-full text-xs" dir="ltr">
          <SelectValue placeholder={value || "-"} />
        </SelectTrigger>
        <SelectContent>
          {data.map((path) => (
            <SelectItem key={path} value={path} className="text-xs">
              {path}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  if ((rule?.kind === "type" && rule.name === "bool") || (!rule && isBoolean(value) && !spec.quoted)) {
    return <Switch checked={value === "true"} onCheckedChange={(next) => write(String(next), false)} aria-label={spec.name} />
  }
  const numeric = rule?.kind === "range" || (rule?.kind === "type" && (rule.name === "number" || rule.name === "int")) || (!rule && isNumeric(value) && !spec.quoted)
  return <Input dir="auto" inputMode={numeric ? "decimal" : undefined} value={value} aria-label={spec.name} onChange={(event) => write(event.target.value, numeric ? false : spec.quoted)} className="h-8 text-xs" />
}

/** The rule of a variable (the values it may have, the range of a number, or its type), in a small popover. */
function RulePopover({ spec, setRule }: { spec: VariableSpec; setRule: (rule: VariableRule | undefined) => void }) {
  const { t } = useTranslation()
  const rule = spec.rule
  const options = rule?.kind === "enum" ? rule.options : []
  const range = rule?.kind === "range" ? rule : undefined
  const type = rule?.kind === "type" ? rule.name : AUTO
  const numeric = isNumeric(spec.value ?? "") || range !== undefined
  const limited = rule !== undefined
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" className={cn("shrink-0", limited ? "text-primary" : "text-muted-foreground")} title={t("config.variableAllowed")} aria-label={t("config.variableAllowed")}>
          <ListChecks />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2 p-3">
        <label className="block space-y-1">
          <span className="text-[11px] text-muted-foreground">{t("config.variableType")}</span>
          <Select value={type} onValueChange={(next) => setRule(next === AUTO ? undefined : { kind: "type", name: next })}>
            <SelectTrigger className="h-8 w-full text-xs" dir="ltr">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTO} className="text-xs text-muted-foreground">
                {t("config.variableAuto")}
              </SelectItem>
              {VARIABLE_TYPES.map((name) => (
                <SelectItem key={name} value={name} className="text-xs">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-muted-foreground">{t("config.variableValues")}</span>
          <Input
            dir="ltr"
            defaultValue={options.join(", ")}
            onChange={(event) => {
              const items = event.target.value.split(",").map((item) => item.trim()).filter((item) => item !== "")
              setRule(items.length ? { kind: "enum", options: items } : undefined)
            }}
            className="h-8 text-xs"
          />
        </label>
        {numeric && (
          <div className="grid grid-cols-2 gap-2">
            {(["min", "max"] as const).map((key) => (
              <label key={key} className="block space-y-1">
                <span className="text-[11px] text-muted-foreground">{t(key === "min" ? "config.variableMin" : "config.variableMax")}</span>
                <Input
                  dir="ltr"
                  inputMode="decimal"
                  defaultValue={range?.[key] ?? ""}
                  onChange={(event) => {
                    const next = { ...(range ?? { kind: "range" as const }), [key]: isNumeric(event.target.value.trim()) ? event.target.value.trim() : undefined }
                    setRule(next.min === undefined && next.max === undefined ? undefined : next)
                  }}
                  className="h-8 text-xs"
                />
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * The variables the file defines (`vars` with the rules of `var-types`; a document's front matter or config.toml), each with a control of
 * its kind, its rule, and a button to take it out. A value that is more than one line is shown but not rewritten.
 */
export function VariablesSection({ text, onChange, format, files, doc, flat }: VariablesSectionProps) {
  const { t } = useTranslation()
  const toml = format === TOML_FORMAT
  const specs = toml ? readTomlVariables(text) : readYamlVariables(text)
  const [adding, setAdding] = useState<string | null>(null)
  const writeValue = (spec: VariableSpec, value: string, quoted = spec.quoted) => onChange(format.set(text, "vars", spec.name, valueLiteral(value, quoted ?? false, format.string)))
  const setRule = (spec: VariableSpec, rule: VariableRule | undefined) => onChange(rule ? format.set(text, "var-types", spec.name, ruleLiteral(rule, toml, format.string)) : format.remove(text, "var-types", spec.name))
  const remove = (spec: VariableSpec) => onChange(format.remove(format.remove(text, "vars", spec.name), "var-types", spec.name))
  const problem = adding === null || adding === "" ? "" : !isVariableName(adding) ? t("config.variableBad") : specs.some((spec) => spec.name === adding) ? t("config.variableTaken") : ""
  const add = () => {
    if (adding === null || adding === "" || problem) return
    onChange(format.set(text, "vars", adding, format.string("")))
    setAdding(null)
  }

  return (
    <section className={flat ? "border-b border-border last:border-b-0" : "mb-3 rounded-xl border border-border bg-card text-card-foreground"}>
      <div className="flex h-9 items-center gap-2 px-3 text-[13px] font-semibold">
        <span className="min-w-0 flex-1 truncate">{t("config.variables")}</span>
        <Button variant="ghost" size="icon-xs" onClick={() => setAdding(adding === null ? "" : null)} title={t("config.addVariable")} aria-label={t("config.addVariable")}>
          <Plus />
        </Button>
      </div>
      <div className={cn("divide-y divide-border border-t border-border", flat && "bg-muted/20")}>
        <p dir="auto" className="px-3 py-2 text-[11px] leading-snug text-muted-foreground">{doc}</p>
        {adding !== null && (
          <div className="flex items-center gap-1 px-3 py-1.5">
            <Input
              autoFocus
              dir="ltr"
              value={adding}
              placeholder={t("config.variableName")}
              aria-label={t("config.variableName")}
              aria-invalid={problem !== ""}
              title={problem}
              onChange={(event) => setAdding(event.target.value.trim())}
              onKeyDown={(event) => {
                if (event.key === "Enter") add()
                if (event.key === "Escape") setAdding(null)
              }}
              className="h-8 flex-1 font-mono text-xs"
            />
            <Button variant="ghost" size="icon-xs" disabled={adding === "" || problem !== ""} onClick={add} aria-label={t("config.addVariable")}>
              <Check />
            </Button>
          </div>
        )}
        {specs.map((spec) => (
          <div key={spec.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,9.5rem)] items-center gap-3 px-3 py-2">
            <div dir="ltr" className="min-w-0 truncate font-mono text-xs font-medium" title={spec.block ? t("config.variableBlock") : undefined}>
              {spec.name}
            </div>
            <div className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                {spec.block ? (
                  <code dir="ltr" className="block truncate rounded bg-muted px-2 py-1.5 font-mono text-[11px]" title={t("config.variableBlock")}>
                    {spec.value ?? ""}
                  </code>
                ) : (
                  <ValueControl spec={spec} files={files} write={(value, quoted) => writeValue(spec, value, quoted)} />
                )}
              </div>
              <RulePopover spec={spec} setRule={(rule) => setRule(spec, rule)} />
              {!spec.block && (
                <Button variant="ghost" size="icon-xs" className="shrink-0 text-muted-foreground" onClick={() => remove(spec)} title={t("config.removeVariable")} aria-label={t("config.removeVariable")}>
                  <X />
                </Button>
              )}
            </div>
          </div>
        ))}
        {specs.length === 0 && adding === null && <p className="px-3 py-2 text-xs text-muted-foreground">{t("config.noVariables")}</p>}
      </div>
    </section>
  )
}
