/**
 * Where the app runs. UI code asks for a *capability* or a form factor instead of an operating system, so a new platform only
 * changes this file.
 *
 * - "android" / "ios": the Tauri mobile apps.
 * - "desktop": the Tauri desktop app (Windows / macOS / Linux).
 * - "web": a plain browser (`vite dev`, the future web build, tests).
 */
export type PlatformKind = "android" | "ios" | "desktop" | "web"
export type DesktopOs = "windows" | "macos" | "linux"

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown }

export const isTauri = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in (window as TauriWindow)

export function platformKind(): PlatformKind {
  if (!isTauri()) return "web"
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
  if (/Android/i.test(ua)) return "android"
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios"
  return "desktop"
}

export const isDesktopApp = () => platformKind() === "desktop"
export const isMobileApp = () => {
  const kind = platformKind()
  return kind === "android" || kind === "ios"
}

/** Operating system of the machine (for shortcut labels: Cmd on macOS, Ctrl elsewhere). */
export function desktopOs(): DesktopOs {
  const ua = typeof navigator !== "undefined" ? `${navigator.platform} ${navigator.userAgent}` : ""
  if (/Mac|iPhone|iPad/i.test(ua)) return "macos"
  if (/Win/i.test(ua)) return "windows"
  return "linux"
}

/**
 * True when the main input is a mouse and keyboard (a desktop or laptop, also a browser on one), false for touch screens.
 * Evaluated per call: a convertible can switch between the two.
 */
export function hasFinePointer(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
}
