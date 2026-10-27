import { useEffect, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { AppLogo } from "@/components/common/AppLogo"
import { EditorMenus, PanelToggles } from "@/components/editor/EditorChrome"
import { LAYERS } from "@/lib/layers"
import { desktopOs, isDesktopApp } from "@/lib/platform"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"

type AppWindow = ReturnType<typeof import("@tauri-apps/api/window").getCurrentWindow>

/** The four window-control glyphs, drawn on a 10 px grid with the same 1 px stroke as the rest of the interface. */
const GLYPHS = {
  minimize: <path d="M1.5 5h7" />,
  maximize: <rect x="1.5" y="1.5" width="7" height="7" rx="1" />,
  restore: (
    <>
      <path d="M3.5 3.5V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1" />
      <rect x="1.5" y="3.5" width="5" height="5" rx="1" />
    </>
  ),
  close: <path d="M2 2l6 6M8 2L2 8" />,
} satisfies Record<string, ReactNode>

function Control({ glyph, label, onClick, danger }: { glyph: keyof typeof GLYPHS; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-full w-11 items-center justify-center text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:bg-muted",
        danger ? "hover:bg-destructive hover:text-white" : "hover:bg-muted"
      )}
    >
      <svg width="14" height="14" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {GLYPHS[glyph]}
      </svg>
    </button>
  )
}

/**
 * The window's own title bar, on the desktop app only (the native one is switched off in `tauri.conf.json`): the app mark and
 * name, a drag area (double-click maximizes), and minimize / maximize / close. The controls sit at the end on Windows and
 * Linux and at the start on macOS. Always left-to-right: window controls do not mirror.
 */
export function TitleBar() {
  const { t } = useTranslation()
  const [maximized, setMaximized] = useState(false)
  const [appWindow, setAppWindow] = useState<AppWindow | null>(null)
  const desktop = isDesktopApp()
  const editing = useWorkspaceStore((state) => state.active)

  useEffect(() => {
    if (!desktop) return
    let stop: (() => void) | undefined
    let cancelled = false
    void import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      const current = getCurrentWindow()
      if (cancelled) return
      setAppWindow(current)
      setMaximized(await current.isMaximized())
      const unlisten = await current.onResized(async () => setMaximized(await current.isMaximized()))
      if (cancelled) unlisten()
      else stop = unlisten
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [desktop])

  if (!desktop) return null

  const mac = desktopOs() === "macos"
  const controls = (
    <div className="flex h-full shrink-0">
      <Control glyph="minimize" label={t("window.minimize")} onClick={() => void appWindow?.minimize()} />
      <Control glyph={maximized ? "restore" : "maximize"} label={maximized ? t("window.restore") : t("window.maximize")} onClick={() => void appWindow?.toggleMaximize()} />
      <Control glyph="close" label={t("window.close")} onClick={() => void appWindow?.close()} danger />
    </div>
  )

  return (
    <div dir="ltr" className={cn("flex h-9 shrink-0 items-stretch border-b border-border bg-sidebar text-sidebar-foreground select-none", LAYERS.CHROME)}>
      {mac && controls}
      <div className="flex min-w-0 items-center gap-2 ps-3">
        <AppLogo size={16} className="pointer-events-none" />
        <span className="pointer-events-none truncate text-xs font-medium">{t("common.appName")}</span>
        {editing && <EditorMenus />}
      </div>
      <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center justify-end gap-2 px-3">
        {editing && <PanelToggles />}
      </div>
      {!mac && controls}
    </div>
  )
}
