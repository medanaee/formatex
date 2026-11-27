import { desktopOs, isDesktopApp } from "@/lib/platform"
import { resolveTheme, type ThemePreference } from "@/lib/theme"

export type WindowGlass = "none" | "mica" | "acrylic"

export const isWindowGlass = (value: unknown): value is WindowGlass =>
  value === "none" || value === "mica" || value === "acrylic"

/** Native DWM window backdrop (Mica / Acrylic) is available only on the Windows desktop app. */
export const supportsWindowGlass = (): boolean => isDesktopApp() && desktopOs() === "windows"

/** Applies both the CSS translucency flag and the native Windows DWM backdrop effect. */
export function applyWindowGlass(mode: WindowGlass, theme: ThemePreference): void {
  if (typeof document === "undefined") return
  const active: WindowGlass = supportsWindowGlass() ? mode : "none"
  if (active === "none") delete document.documentElement.dataset.glass
  else document.documentElement.dataset.glass = active

  if (!supportsWindowGlass()) return
  const dark = resolveTheme(theme) === "dark"
  void import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke("window_set_glass", { mode: active, dark }))
    .catch(() => {})
}
