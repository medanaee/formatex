import { isTauri } from "@/lib/platform"

async function call<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<T>(command, args)
}

/**
 * Files and folders copied in the system's file manager are copied into `target` of the project by the native side (the browser gives
 * them only to a real paste event, never to a menu item). Returns their new paths; empty when there are none, or outside the desktop app.
 */
export async function pasteSystemFiles(projectId: string, target: string, reserveRoots: boolean): Promise<string[]> {
  if (!isTauri()) return []
  try {
    return await call<string[]>("clipboard_import", { projectId, target, reserveRoots })
  } catch (error) {
    console.warn("[formatex] could not read files from the clipboard", error)
    return []
  }
}

/** The picture on the system clipboard as a PNG, read by the native side; `null` when there is none (or outside the desktop app). */
export async function systemImage(): Promise<Blob | null> {
  if (!isTauri()) return null
  try {
    const bytes = new Uint8Array(await call<ArrayBuffer>("clipboard_image", {}))
    return bytes.length ? new Blob([bytes], { type: "image/png" }) : null
  } catch (error) {
    console.warn("[formatex] could not read a picture from the clipboard", error)
    return null
  }
}
