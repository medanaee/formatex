import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { startPersistence } from "@/lib/db/sync"

type BootState = { status: "loading" } | { status: "ready" } | { status: "error"; message: string }

/**
 * Opens the storage (SQLite in the app) and loads the library before anything is shown. A failure is shown with a retry
 * instead of silently starting with empty data, which would look like all documents were lost.
 */
export function StorageBoot({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [state, setState] = useState<BootState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    startPersistence()
      .then(() => !cancelled && setState({ status: "ready" }))
      .catch((error: unknown) => {
        console.error("[formatex] storage failed to start", error)
        if (!cancelled) setState({ status: "error", message: String((error as Error)?.message ?? error) })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: "loading" })
    setAttempt((n) => n + 1)
  }, [])

  if (state.status === "ready") return <>{children}</>
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background p-6 text-center text-foreground">
      {state.status === "loading" ? (
        <div
          className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
          role="status"
          aria-label={t("common.loading")}
        />
      ) : (
        <>
          <p className="text-sm font-semibold">{t("boot.storageFailed")}</p>
          <p dir="auto" className="max-w-md break-words text-xs text-muted-foreground">
            {state.message}
          </p>
          <Button size="lg" onClick={retry}>
            {t("common.retry")}
          </Button>
        </>
      )}
    </div>
  )
}
