import { useEffect, useState } from "react"
import { ChevronDown, CircleAlert, Loader2, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { listRemote, remoteFile, type RemoteItem } from "@/lib/compiler"
import { useEditorStore } from "@/stores/useEditorStore"

/** `12 KB`, `1.4 MB`: the size of a kept file. */
function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" }

/** A very small picture of a kept image, read from the cache (never downloaded here). */
function Thumb({ projectId, url, version }: { projectId: string; url: string; version: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    let made: string | null = null
    const ext = url.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? ""
    void remoteFile(projectId, url)
      .then((bytes) => {
        if (!live) return
        made = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: MIME[ext] ?? "image/png" }))
        setSrc(made)
      })
      .catch(() => undefined)
    return () => {
      live = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [projectId, url, version])
  return src ? <img src={src} alt="" className="size-8 shrink-0 rounded-sm border border-border object-cover" /> : <span className="size-8 shrink-0 rounded-sm bg-muted" />
}

/** The arrow beside the sync button: everything the project keeps from the internet, each with a button that downloads just that again. */
export function RemoteFilesMenu({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation()
  const projectId = useEditorStore((state) => state.projectId)
  const syncStatus = useEditorStore((state) => state.syncStatus)
  const syncMessage = useEditorStore((state) => state.syncMessage)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<RemoteItem[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  // Changes whenever a sync finishes, so the pictures and sizes are read again
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!open || !projectId) return
    let live = true
    void listRemote(projectId)
      .then((list) => live && setItems(list))
      .catch(() => live && setItems([]))
    return () => {
      live = false
    }
  }, [open, projectId, version, syncStatus])

  const syncOne = async (url: string) => {
    setBusy(url)
    await useEditorStore.getState().syncRemote(url)
    setBusy(null)
    setVersion((current) => current + 1)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={disabled} title={t("editor.remoteFiles")} aria-label={t("editor.remoteFiles")} className="-ms-1 w-5">
          <ChevronDown className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[min(70vh,24rem)] w-80 gap-0 overflow-y-auto p-1">
        {items === null ? (
          <Loader2 className="m-3 size-4 animate-spin text-muted-foreground" />
        ) : items.length === 0 ? (
          <p className="p-3 text-center text-xs text-muted-foreground">{t("editor.remoteEmpty")}</p>
        ) : (
          items.map((item) => (
            <div key={item.url} className="flex items-center gap-2 rounded-md p-1.5 hover:bg-accent/50">
              {item.image && projectId ? <Thumb projectId={projectId} url={item.url} version={version} /> : <span className="size-8 shrink-0 rounded-sm bg-muted" />}
              <span className="min-w-0 flex-1">
                <span dir="ltr" title={item.url} className="block truncate text-start text-xs">
                  {item.url.replace(/^(https?|file):\/\/\/?/, "")}
                </span>
                <span className="block text-[11px] text-muted-foreground">{sizeLabel(item.size)}</span>
              </span>
              <Button variant="ghost" size="icon-xs" disabled={busy !== null} onClick={() => void syncOne(item.url)} title={t("editor.syncOne")} aria-label={t("editor.syncOne")}>
                {busy === item.url ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              </Button>
            </div>
          ))
        )}
        {syncStatus === "error" && (
          <p className="flex items-start gap-1.5 p-2 text-[11px] text-destructive">
            <CircleAlert className="mt-px size-3 shrink-0" />
            <span className="min-w-0 break-words">{syncMessage}</span>
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
