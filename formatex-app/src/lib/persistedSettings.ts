/** Key of the zustand `persist` entry of the settings store. Read before React starts, to avoid a flash of the wrong theme / language. */
export const SETTINGS_STORAGE_KEY = "formatex_app_settings"

/** The raw persisted settings (`state` part), or `{}` when nothing usable is stored. Never throws. */
export function readPersistedSettings(): Record<string, unknown> {
  try {
    if (typeof localStorage === "undefined") return {}
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    const state = raw ? (JSON.parse(raw) as { state?: unknown }).state : null
    return state && typeof state === "object" ? (state as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
