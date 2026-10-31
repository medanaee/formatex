import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { ResponsiveDialog } from "@/components/common/ResponsiveDialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { CONFIG_FILE, type FsEntry } from "@/lib/projects"
import { listFolderProject, moveToFolder, moveToLocal, pickFolder, planToFolder } from "@/lib/projects/storageMode"
import type { MovePlan, Resolution } from "@/lib/projects/storagePlan"
import { useEditorStore } from "@/stores/useEditorStore"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"

interface DialogProps {
  projectId: string
}

const close = () => useWorkspaceStore.getState().set({ storageDialog: null })

/** After the files changed place the editor opens the project again, from its new home. */
const reopen = (projectId: string) => useEditorStore.getState().open(projectId)

/** A local project moves into a folder: choose it, answer for the files that are there already, move. */
function ToFolder({ projectId }: DialogProps) {
  const { t } = useTranslation()
  const [folder, setFolder] = useState<string | null>(null)
  const [plan, setPlan] = useState<{ plan: MovePlan; target: FsEntry[] } | null>(null)
  const [answers, setAnswers] = useState<Record<string, Resolution>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = async () => {
    const chosen = await pickFolder()
    if (!chosen) return
    setFolder(chosen)
    setError(null)
    try {
      const next = await planToFolder(projectId, chosen)
      setPlan(next)
      setAnswers(Object.fromEntries(next.plan.conflicts.map((path) => [path, "skip" as Resolution])))
    } catch (cause) {
      setPlan(null)
      setError(String(cause))
    }
  }

  const move = async () => {
    if (!folder) return
    setBusy(true)
    setError(null)
    try {
      await moveToFolder(projectId, folder, answers)
      await reopen(projectId)
      close()
    } catch (cause) {
      setError(t("storage.failed", { message: String(cause) }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-3 text-xs">
      <p className="text-muted-foreground">{t("storage.toFolderNote")}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => void choose()} disabled={busy}>
          {folder ? t("storage.changeFolder") : t("storage.chooseFolder")}
        </Button>
        <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground" title={folder ?? undefined}>
          {folder ?? t("storage.noFolder")}
        </span>
      </div>
      {plan && plan.plan.conflicts.length > 0 && (
        <div className="grid gap-1.5">
          <div className="font-medium">{t("storage.conflicts", { count: plan.plan.conflicts.length })}</div>
          <div className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {plan.plan.conflicts.map((path) => (
              <div key={path} className="flex items-center justify-between gap-2 px-2 py-1.5">
                <span dir="ltr" className="min-w-0 truncate font-mono text-[11px]" title={path}>
                  {path}
                </span>
                <SegmentedControl
                  compact
                  label={path}
                  value={answers[path] ?? "skip"}
                  onValueChange={(value) => setAnswers((current) => ({ ...current, [path]: value }))}
                  options={[
                    { value: "replace", label: t("storage.replace") },
                    { value: "skip", label: t("storage.skip") },
                    ...(path === CONFIG_FILE ? [] : [{ value: "both" as const, label: t("storage.both") }]),
                  ]}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="lg" onClick={close} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <Button size="lg" onClick={() => void move()} disabled={!folder || !plan || busy}>
          {busy ? t("storage.moving") : t("storage.move")}
        </Button>
      </div>
    </div>
  )
}

/** A folder project moves into the app's storage: tick the files to copy. `config.toml` always goes. */
function ToLocal({ projectId }: DialogProps) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<string[] | null>(null)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void listFolderProject(projectId).then((entries) => {
      if (!live) return
      const names = entries.filter((entry) => entry.kind === "file" && entry.path !== CONFIG_FILE).map((entry) => entry.path)
      setFiles(names)
      setSelected(new Set(names))
    })
    return () => {
      live = false
    }
  }, [projectId])

  const toggle = (path: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current)
      if (on) next.add(path)
      else next.delete(path)
      return next
    })
  const count = useMemo(() => files?.filter((path) => selected.has(path)).length ?? 0, [files, selected])

  const move = async () => {
    setBusy(true)
    setError(null)
    try {
      await moveToLocal(projectId, selected)
      await reopen(projectId)
      close()
    } catch (cause) {
      setError(t("storage.failed", { message: String(cause) }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-3 text-xs">
      <p className="text-muted-foreground">{t("storage.toLocalNote")}</p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(files))}>
          {t("storage.selectAll")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
          {t("storage.selectNone")}
        </Button>
        <span className="ms-auto text-muted-foreground">{count}</span>
      </div>
      <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        <div className="flex h-9 items-center gap-2 px-2 text-muted-foreground">
          <Checkbox checked disabled aria-label={CONFIG_FILE} />
          <span dir="ltr" className="font-mono text-[11px]">
            {CONFIG_FILE}
          </span>
          <span className="ms-auto">{t("storage.configAlways")}</span>
        </div>
        {(files ?? []).map((path) => (
          <label key={path} className="flex h-9 cursor-pointer items-center gap-2 px-2 hover:bg-muted/50">
            <Checkbox checked={selected.has(path)} onCheckedChange={(on) => toggle(path, on === true)} />
            <span dir="ltr" className="min-w-0 truncate font-mono text-[11px]" title={path}>
              {path}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="lg" onClick={close} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <Button size="lg" onClick={() => void move()} disabled={files === null || busy}>
          {busy ? t("storage.moving") : t("storage.move")}
        </Button>
      </div>
    </div>
  )
}

/** The dialogs of the File menu's "Move to a folder" and "Move to the app's storage" (shown by `useWorkspaceStore.storageDialog`). */
export function StorageDialogs() {
  const { t } = useTranslation()
  const mode = useWorkspaceStore((state) => state.storageDialog)
  const projectId = useEditorStore((state) => state.projectId)
  return (
    <ResponsiveDialog open={mode !== null && !!projectId} onOpenChange={(open) => !open && close()} title={mode === "toLocal" ? t("storage.toLocalTitle") : t("storage.toFolderTitle")}>
      {mode && projectId && (mode === "toFolder" ? <ToFolder key="to-folder" projectId={projectId} /> : <ToLocal key="to-local" projectId={projectId} />)}
    </ResponsiveDialog>
  )
}
