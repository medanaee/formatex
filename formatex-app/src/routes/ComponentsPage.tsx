import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { AlertTriangle, ArrowLeft, Check, CircleAlert, Loader2, MoreHorizontal, Plus, RotateCcw, Search, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ResponsiveDialog } from "@/components/common/ResponsiveDialog"
import { CodeEditor, type RevealRequest } from "@/components/editor/CodeEditor"
import { DiagnosticList } from "@/components/editor/DiagnosticList"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Switch } from "@/components/ui/switch"
import { useFormFactor } from "@/hooks/useFormFactor"
import type { ComponentInfo } from "@/lib/components/api"
import { componentNameProblem, type ComponentKind } from "@/lib/components/template"
import type { Diagnostic } from "@/lib/compiler"
import { cn } from "@/lib/utils"
import { useComponentsStore } from "@/stores/useComponentsStore"

function Badge({ children, className }: { children: string; className?: string }) {
  return <span className={cn("shrink-0 rounded bg-muted px-1 text-[10px] leading-4 text-muted-foreground", className)}>{children}</span>
}

function OriginBadges({ info }: { info: ComponentInfo }) {
  const { t } = useTranslation()
  return (
    <>
      {info.origin === "user" && <Badge>{t("components.custom")}</Badge>}
      {info.origin === "store" && <Badge>{t("components.store")}</Badge>}
      {info.modified && <Badge>{t("components.modified")}</Badge>}
      {info.problem && <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-label={info.problem} />}
    </>
  )
}

function ComponentList({ selected }: { selected?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const components = useComponentsStore((state) => state.components)
  const [query, setQuery] = useState("")

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? components.filter((c) => c.name.includes(needle) || c.tags.some((tag) => tag.includes(needle))) : components
  }, [components, query])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("components.search")}
          aria-label={t("components.search")}
          dir="auto"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto" role="list">
        {shown.length === 0 && <li className="p-4 text-center text-xs text-muted-foreground">{t("components.empty")}</li>}
        {shown.map((info) => (
          <li key={info.name} className={cn("flex items-center gap-2 border-b border-border/60 pe-2 ps-3", info.name === selected && "bg-accent text-accent-foreground")}>
            <button type="button" onClick={() => void navigate({ to: "/components/$name", params: { name: info.name } })} className={cn("min-w-0 flex-1 py-1.5 text-start outline-none focus-visible:underline", !info.enabled && "opacity-50")}>
              <span className="flex items-center gap-1.5">
                <span dir="ltr" className="truncate font-mono text-[13px]">{info.name}</span>
                <OriginBadges info={info} />
              </span>
              <span dir="ltr" className="block truncate text-[11px] text-muted-foreground">
                {info.tags.length ? info.tags.map((tag) => `<${tag}>`).join(" ") : "—"}
              </span>
            </button>
            <Switch size="sm" checked={info.enabled} aria-label={t("components.enabled")} onCheckedChange={(enabled) => void useComponentsStore.getState().setEnabled(info.name, enabled)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function NewComponentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const components = useComponentsStore((state) => state.components)
  const [name, setName] = useState("")
  const [kind, setKind] = useState<ComponentKind>("inline")

  const typed = name.trim()
  const problem = typed ? componentNameProblem(typed, new Set(components.map((c) => c.name))) : null

  const submit = async () => {
    if (!typed || problem) return
    await useComponentsStore.getState().create(typed, kind)
    onOpenChange(false)
    setName("")
    void navigate({ to: "/components/$name", params: { name: typed } })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("components.new")}
      footer={
        <>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button size="lg" disabled={!typed || problem !== null} onClick={() => void submit()}>
            {t("common.create")}
          </Button>
        </>
      }
    >
      <div className="grid gap-2">
        <Input
          dir="ltr"
          autoFocus
          value={name}
          placeholder={t("components.namePlaceholder")}
          aria-label={t("components.name")}
          aria-invalid={problem !== null}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void submit()}
          className="h-10 font-mono"
        />
        <p className={cn("h-4 text-xs", problem ? "text-destructive" : "text-transparent")} role={problem ? "alert" : undefined}>
          {problem ? t(`components.problem.${problem}`) : "."}
        </p>
        <SegmentedControl
          value={kind}
          onValueChange={setKind}
          label={t("components.kind")}
          options={[
            { value: "inline", label: t("components.inline") },
            { value: "block", label: t("components.block") },
          ]}
        />
      </div>
    </ResponsiveDialog>
  )
}

function ComponentEditor({ name }: { name: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const wide = useFormFactor() !== "phone"
  const info = useComponentsStore((state) => state.components.find((c) => c.name === name))
  const text = useComponentsStore((state) => state.texts[name])
  const saveState = useComponentsStore((state) => state.saveState)
  const check = useComponentsStore((state) => state.check)
  const [reveal, setReveal] = useState<RevealRequest | null>(null)
  const [confirm, setConfirm] = useState<"delete" | "revert" | null>(null)

  useEffect(() => {
    void useComponentsStore.getState().open(name)
  }, [name, info?.modified])

  const go = (diagnostic: Diagnostic) => {
    const target = /^components\/(.+)\.typ$/.exec(diagnostic.path ?? "")?.[1]
    if (!target || !diagnostic.line) return
    if (target !== name) void navigate({ to: "/components/$name", params: { name: target } })
    else setReveal({ path: `component:${name}`, line: diagnostic.line, column: diagnostic.column ?? 1, id: Date.now() })
  }

  if (!info) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("components.select")}</div>

  const custom = info.origin !== "builtin"
  const problems = check?.diagnostics ?? []

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-10 shrink-0 items-center gap-1.5 border-b border-border ps-1 pe-2 select-none">
        {!wide && (
          <Button variant="ghost" size="icon-lg" asChild>
            <Link to="/components" title={t("components.back")} aria-label={t("components.back")}>
              <ArrowLeft className="rtl:rotate-180" />
            </Link>
          </Button>
        )}
        <span dir="ltr" className={cn("truncate font-mono text-[13px] font-semibold", wide && "ps-2")}>{info.name}</span>
        <OriginBadges info={info} />
        <span className="flex-1" />
        <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground" role="status" title={saveState === "saved" ? t("editor.saved") : saveState === "saving" ? t("editor.saving") : t("editor.saveFailed")}>
          {saveState === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : saveState === "error" ? <CircleAlert className="size-3.5 text-destructive" /> : <Check className="size-3.5" />}
        </span>
        <Switch size="sm" checked={info.enabled} aria-label={t("components.enabled")} onCheckedChange={(enabled) => void useComponentsStore.getState().setEnabled(name, enabled)} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-lg" aria-label={t("files.more")}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {info.modified && (
              <DropdownMenuItem onSelect={() => setConfirm("revert")}>
                <RotateCcw /> {t("components.revert")}
              </DropdownMenuItem>
            )}
            {info.modified && custom && <DropdownMenuSeparator />}
            {custom && (
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("delete")}>
                <Trash2 /> {t("components.delete")}
              </DropdownMenuItem>
            )}
            {!info.modified && !custom && (
              <DropdownMenuItem disabled>
                <RotateCcw /> {t("components.revert")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {info.problem && (
        <p dir="auto" className="flex items-start gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-xs">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" /> {info.problem}
        </p>
      )}

      <div className="min-h-0 flex-1">
        {text !== undefined && (
          <CodeEditor path={`component:${name}`} kind="typst" value={text} reveal={reveal} onChange={(next) => useComponentsStore.getState().edit(name, next)} />
        )}
      </div>

      {check && !check.ok && <p className="border-t border-border bg-muted/40 px-3 py-1 text-xs text-destructive">{t("components.libraryBroken")}</p>}
      {problems.length > 0 && <DiagnosticList diagnostics={problems} onGo={go} className="max-h-[35%] shrink-0 border-t border-border" />}

      <ResponsiveDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "revert" ? t("components.revert") : t("components.delete")}
        description={confirm === "revert" ? t("components.revertConfirm") : t("components.deleteConfirm", { name })}
        footer={
          <>
            <Button variant="outline" size="lg" onClick={() => setConfirm(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => {
                const wasCustom = custom
                setConfirm(null)
                void useComponentsStore
                  .getState()
                  .remove(name)
                  .then(() => {
                    if (wasCustom) void navigate({ to: "/components" })
                  })
              }}
            >
              {confirm === "revert" ? t("components.revert") : t("common.delete")}
            </Button>
          </>
        }
      />
    </div>
  )
}

/**
 * The component library: the engine's built-in components and the user's own. Each is one Typst file with the code of its tags
 * and their schema; edit it, add one, disable one. A saved component is checked at once, its tags join autocomplete, and the
 * registry the engine imports is regenerated by the app, so nobody runs a script.
 */
export function ComponentsPage() {
  const { t } = useTranslation()
  const { name } = useParams({ strict: false }) as { name?: string }
  const wide = useFormFactor() !== "phone"
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    void useComponentsStore.getState().refresh()
  }, [])

  const showList = wide || !name
  const showEditor = wide || !!name

  return (
    <>
      {showList && (
        <PageHeader
          title={t("components.title")}
          actions={
            <Button size="lg" onClick={() => setCreating(true)}>
              <Plus data-icon="inline-start" />
              <span className="hidden sm:inline">{t("components.new")}</span>
              <span className="sr-only sm:hidden">{t("components.new")}</span>
            </Button>
          }
        />
      )}
      <div className="flex min-h-0 flex-1">
        {showList && (
          <aside className={cn("min-h-0 border-e border-border", wide ? "w-72 shrink-0" : "flex-1")}>
            <ComponentList selected={name} />
          </aside>
        )}
        {showEditor && <section className="min-w-0 flex-1">{name ? <ComponentEditor key={name} name={name} /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("components.select")}</div>}</section>}
      </div>
      <NewComponentDialog open={creating} onOpenChange={setCreating} />
    </>
  )
}
