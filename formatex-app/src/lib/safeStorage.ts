import type { PersistStorage, StorageValue } from "zustand/middleware"
import { create } from "zustand"

/**
 * Tracks whether persisting to localStorage failed (e.g. quota exceeded) so the UI can warn the user
 * instead of silently losing their work.
 */
interface SaveStatusState {
  error: string | null
  setError: (error: string | null) => void
}

export const useSaveStatusStore = create<SaveStatusState>((set) => ({
  error: null,
  setError: (error) => set({ error }),
}))

/** Keeps coordinates compact on disk: 2 decimals are far below one device pixel. */
export const roundReplacer = (_key: string, value: unknown) =>
  typeof value === "number" && !Number.isInteger(value) ? Math.round(value * 100) / 100 : value

/** In-memory fallback map for Node.js / headless test environments without window.localStorage. */
const memoryStorage = new Map<string, string>()

function getStorageBackend(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage
    }
    if (typeof localStorage !== "undefined") {
      return localStorage
    }
  } catch {
    // Access denied or restricted iframe
  }
  return null
}

/**
 * Robust localStorage backed zustand persist storage that never throws:
 * - Falls back cleanly to in-memory map in headless test/SSR environments
 * - Read errors / corrupt JSON fall back gracefully to "nothing stored"
 * - Write errors (quota exceeded) are reported through `useSaveStatusStore` and logged
 */
export function createSafeJsonStorage<S>(): PersistStorage<S> {
  return {
    getItem: (name) => {
      try {
        const backend = getStorageBackend()
        const raw = backend ? backend.getItem(name) : (memoryStorage.get(name) ?? null)
        return raw ? (JSON.parse(raw) as StorageValue<S>) : null
      } catch (error) {
        console.error(`[formatex] could not read "${name}"`, error)
        return null
      }
    },
    setItem: (name, value) => {
      try {
        const serialized = JSON.stringify(value, roundReplacer)
        const backend = getStorageBackend()
        if (backend) {
          backend.setItem(name, serialized)
        } else {
          memoryStorage.set(name, serialized)
        }
        if (useSaveStatusStore.getState().error) {
          useSaveStatusStore.getState().setError(null)
        }
      } catch (error) {
        console.error(`[formatex] could not save "${name}"`, error)
        useSaveStatusStore.getState().setError(String((error as Error)?.message ?? error))
      }
    },
    removeItem: (name) => {
      try {
        const backend = getStorageBackend()
        if (backend) {
          backend.removeItem(name)
        } else {
          memoryStorage.delete(name)
        }
      } catch {
        // Ignore
      }
    },
  }
}
