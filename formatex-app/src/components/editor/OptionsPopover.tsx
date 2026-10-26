import { createElement, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { ColorField, LengthField } from "@/components/editor/fields"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { editFor } from "@/lib/editor/applyOptions"
import type { ConfigureRequest } from "@/lib/editor/livePreview"
import { localized, type AttrSpec } from "@/lib/editor/schema"
import { tagIcon } from "@/lib/editor/tagIcons"
import { attrValue, withAttr } from "@/lib/editor/tagSyntax"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"
import { useEditorViewStore } from "@/stores/useEditorViewStore"
import { useSchemaStore } from "@/stores/useSchemaStore"

const UNSET = "__unset__"
const IMAGE = /\.(png|jpe?g|gif|svg|webp|bmp)$/i

interface OptionsPopoverProps {
  request: ConfigureRequest | null
  /** The request as it stands after an edit (the popover follows its own changes in the text). */
  onRequestChange: (request: ConfigureRequest | null) => void
}

/** One field of the form, by the type the schema gives the attribute. */
function Field({ name, spec, value, files, onChange }: { name: string; spec: AttrSpec; value: string; files: string[]; onChange: (value: string) => void }) {
  const { t } = useTranslation()
  const choose = (values: string[]) => (
    <Select value={value || UNSET} onValueChange={(next) => onChange(next === UNSET ? "" : next)}>
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

  if (spec.type === "enum" && spec.values) return choose(spec.values)
  if (spec.type === "bool") return choose(["true", "false"])
  if (spec.type === "path") return choose([...files].sort((a, b) => Number(IMAGE.test(b)) - Number(IMAGE.test(a)) || a.localeCompare(b)))
  if (spec.type === "color") return <ColorField value={value} onChange={onChange} placeholder={spec.default} />
  if (spec.type === "length") return <LengthField value={value} onChange={onChange} placeholder={spec.default} />
  return (
    <Input
      dir="ltr"
      value={value}
      placeholder={spec.default ?? ""}
      inputMode={spec.type === "int" || spec.type === "number" ? "decimal" : undefined}
      aria-label={name}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 text-xs"
    />
  )
}

/**
 * The settings of one tag, heading or table, as a form generated from the engine's schema: an enum is a list, a boolean is
 * true / false, a path lists the project's files, the rest are text. Every change is written into the source at once.
 */
export function OptionsPopover({ request, onRequestChange }: OptionsPopoverProps) {
  const { t, i18n } = useTranslation()
  const schema = useSchemaStore((state) => state.schema)
  const files = useEditorStore((state) => state.files)
  const view = useEditorViewStore((state) => state.view)
  const paths = useMemo(() => files.filter((entry) => entry.kind === "file").map((entry) => entry.path), [files])

  if (!request) return null
  const spec = request.kind === "tag" ? schema.tags[request.name] : schema.options[request.option]
  const attrs = spec?.attrs ?? {}
  const title = request.kind === "tag" ? `<${request.name}>` : t(request.option === "heading" ? "options.heading" : request.option === "list" ? "options.list" : "options.table")
  const description = request.kind === "tag" ? localized(schema.tags[request.name]?.description, i18n.language) : localized(schema.options[request.option]?.where, i18n.language)
  // Required attributes first, then the schema's order
  const names = Object.keys(attrs).sort((a, b) => Number(!!attrs[b].required) - Number(!!attrs[a].required))
  const known = new Set(names)
  const extra = request.attrs.filter(([key]) => !known.has(key))

  const change = (name: string, value: string) => {
    if (!view) return
    const { edit, next } = editFor(request, withAttr(request.attrs, name, value), view.state.doc.length)
    view.dispatch({ changes: edit })
    onRequestChange(next)
  }

  const a = request.anchor

  return (
    <Popover open onOpenChange={(open) => !open && onRequestChange(null)}>
      <PopoverAnchor asChild>
        <span style={{ position: "fixed", left: a.left, top: a.top, width: a.width, height: a.height, pointerEvents: "none" }} />
      </PopoverAnchor>
      <PopoverContent align="start" className="max-h-[min(70vh,28rem)] w-80 gap-0 overflow-y-auto p-0" onOpenAutoFocus={(event) => event.preventDefault()}>
        <div className="flex items-start gap-2 border-b border-border p-3">
          {request.kind === "tag" && createElement(tagIcon(request.name), { className: "mt-0.5 size-4 shrink-0 text-muted-foreground" })}
          <div className="min-w-0">
            <div dir="ltr" className="font-mono text-[13px] font-semibold">{title}</div>
            {description && <div dir="auto" className="text-xs text-muted-foreground">{description}</div>}
          </div>
        </div>
        <div className="grid gap-2.5 p-3">
          {names.length === 0 && extra.length === 0 && <p className="text-xs text-muted-foreground">{t("options.none")}</p>}
          {names.map((name) => {
            const field = attrs[name]
            return (
              <label key={name} className="grid gap-1" title={localized(field.doc, i18n.language)}>
                <span className={cn("flex items-center gap-1 font-mono text-[11px] text-muted-foreground", field.required && "text-foreground")}>
                  {field.shorthand === "#" ? "#id" : name}
                  {field.required && <span className="text-destructive">*</span>}
                  <span className="ms-auto font-sans text-[10px]">{field.type}</span>
                </span>
                <Field name={name} spec={field} value={attrValue(request.attrs, name)} files={paths} onChange={(value) => change(name, value)} />
              </label>
            )
          })}
          {extra.map(([key, value]) => (
            <label key={key} className="grid gap-1">
              <span className="font-mono text-[11px] text-muted-foreground">{key}</span>
              <Input dir="ltr" value={value} aria-label={key} onChange={(event) => change(key, event.target.value)} className="h-8 text-xs" />
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
