import { isTauri } from "@/lib/platform"

export interface SaveResult {
  saved: boolean
  /** Where the file went, when known. */
  path?: string
}

/**
 * Saves a file the user asked for (an exported PDF).
 * - In the app (desktop and Android): the native "Save as" dialog, then plugin-fs writes it (it handles Android's content:// URIs).
 * - In a browser: the File System Access picker where it exists, else a download.
 */
export async function saveBytes(bytes: Uint8Array, fileName: string, mime: string): Promise<SaveResult> {
  const extension = fileName.includes(".") ? fileName.split(".").pop()! : ""

  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog")
    const { writeFile } = await import("@tauri-apps/plugin-fs")
    const path = await save({
      defaultPath: fileName,
      filters: extension ? [{ name: extension.toUpperCase(), extensions: [extension] }] : undefined,
    })
    if (!path) return { saved: false }
    await writeFile(path, bytes)
    return { saved: true, path }
  }

  const picker = (window as unknown as { showSaveFilePicker?: (options: unknown) => Promise<{ name: string; createWritable: () => Promise<{ write: (data: Uint8Array) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: fileName,
        types: extension ? [{ description: extension.toUpperCase(), accept: { [mime]: [`.${extension}`] } }] : undefined,
      })
      const writable = await handle.createWritable()
      await writable.write(bytes)
      await writable.close()
      return { saved: true, path: handle.name }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return { saved: false }
      // Denied or unsupported: fall through to a plain download
    }
  }

  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return { saved: true }
}

/** Lets the user pick files (images, fonts) and returns their names and bytes. Cancelling returns an empty list. */
export async function pickFiles(options: { extensions?: string[]; multiple?: boolean }): Promise<{ name: string; data: Uint8Array }[]> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog")
    const { readFile } = await import("@tauri-apps/plugin-fs")
    const picked = await open({
      multiple: options.multiple ?? true,
      filters: options.extensions ? [{ name: "Files", extensions: options.extensions }] : undefined,
    })
    const paths = picked === null ? [] : Array.isArray(picked) ? picked : [picked]
    return Promise.all(
      paths.map(async (path) => ({
        name: decodeURIComponent(path.split(/[\\/]/).pop() ?? "file"),
        data: await readFile(path),
      }))
    )
  }

  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = options.multiple ?? true
    if (options.extensions) input.accept = options.extensions.map((extension) => `.${extension}`).join(",")
    input.onchange = async () => {
      resolve(await Promise.all([...(input.files ?? [])].map(async (file) => ({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) }))))
    }
    input.oncancel = () => resolve([])
    input.click()
  })
}
