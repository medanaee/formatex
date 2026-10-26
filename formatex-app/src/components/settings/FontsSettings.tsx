import { useEffect, useState } from "react"
import { Loader2, Trash2, Upload } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { listFonts, type FontFamily } from "@/lib/compiler"
import { importedFontFiles, importFonts, removeImportedFont } from "@/lib/files/fonts"
import { isTauri, platformKind } from "@/lib/platform"

const ORIGINS = ["imported", "system", "embedded"] as const

/**
 * The fonts the compiler can use. Desktop reads the operating system's fonts by itself; Android has few, so the user imports
 * the fonts their documents need (ttf / otf / ttc), kept in the app's own folder. Imported fonts win over system ones.
 */
export function FontsSettings() {
  const { t } = useTranslation()
  const [families, setFamilies] = useState<FontFamily[] | null>(null)
  const [files, setFiles] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const native = isTauri()

  // Bumped after every change, which reads the fonts again
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!native) return
    let cancelled = false
    Promise.all([listFonts(), importedFontFiles()])
      .then(([list, imported]) => {
        if (cancelled) return
        setFamilies(list)
        setFiles(imported)
      })
      .catch((error) => console.error("[formatex] could not list fonts", error))
    return () => {
      cancelled = true
    }
  }, [native, version])

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await action()
      setVersion((value) => value + 1)
    } finally {
      setBusy(false)
    }
  }

  if (!native) return <p className="p-3 text-xs text-muted-foreground">{t("fonts.unavailable")}</p>

  const count = (origin: FontFamily["origin"]) => families?.filter((family) => family.origin === origin).length ?? 0

  return (
    <div className="divide-y divide-border">
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="min-w-0 text-xs text-muted-foreground">{platformKind() === "android" ? t("fonts.androidNote") : t("fonts.desktopNote")}</p>
        <Button size="lg" disabled={busy} onClick={() => void run(importFonts)} className="shrink-0">
          {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
          {t("fonts.import")}
        </Button>
      </div>

      {files.length > 0 && (
        <ul className="divide-y divide-border">
          {files.map((file) => (
            <li key={file} className="flex items-center gap-2 ps-3 pe-1 text-xs">
              <span dir="ltr" className="min-w-0 flex-1 truncate font-mono">{file}</span>
              <Button variant="ghost" size="icon-lg" disabled={busy} onClick={() => void run(() => removeImportedFont(file))} title={t("fonts.remove")} aria-label={t("fonts.remove")}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="p-3">
        {families === null ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label={t("common.loading")} />
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {ORIGINS.map((origin) => (
                <span key={origin}>
                  {t(`fonts.${origin}`)} <span className="tabular-nums text-foreground">{count(origin)}</span>
                </span>
              ))}
            </div>
            <ul className="max-h-48 overflow-y-auto rounded-md border border-border bg-background">
              {families.map((family) => (
                <li key={family.family} className="flex items-center justify-between gap-2 border-b border-border px-2 py-1 text-xs last:border-b-0">
                  <span dir="auto" className="truncate">{family.family}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{t(`fonts.${family.origin}`)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
