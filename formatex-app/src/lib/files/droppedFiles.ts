import { IGNORED_DIRS } from "@/lib/projects/paths"

/** A file read from what was dropped: its path from the dropped folder's parent (`images/a.png`), and its bytes. */
export interface DroppedFile {
  path: string
  data: Uint8Array
}

/** Most files one drop brings in: a drop of a whole disk is not what anybody means. */
export const MAX_DROPPED = 5000

const SKIPPED = new Set<string>([...IGNORED_DIRS, ".DS_Store", "Thumbs.db", "__MACOSX"])

/**
 * The entries of a drop, taken at once: a drag's items can only be read while the drop event is being handled, so this is called
 * before anything is awaited. A folder is an entry that holds more; a browser without entries gives the plain files.
 */
export function droppedEntries(data: DataTransfer): (FileSystemEntry | File)[] {
  const entries: (FileSystemEntry | File)[] = []
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== "file") continue
    const entry = typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null
    const file = item.getAsFile()
    if (entry) entries.push(entry)
    else if (file) entries.push(file)
  }
  if (entries.length === 0) entries.push(...Array.from(data.files ?? []))
  return entries
}

const readFile = (entry: FileSystemFileEntry): Promise<File> => new Promise((resolve, reject) => entry.file(resolve, reject))

/** All the entries of a folder: `readEntries` gives them in batches until it gives none. */
async function readAll(directory: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = directory.createReader()
  const all: FileSystemEntry[] = []
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject))
    if (batch.length === 0) return all
    all.push(...batch)
  }
}

/** Reads the dropped files and everything inside the dropped folders, keeping the folder structure. */
export async function readDropped(entries: readonly (FileSystemEntry | File)[], limit = MAX_DROPPED): Promise<DroppedFile[]> {
  const out: DroppedFile[] = []
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (out.length >= limit || SKIPPED.has(entry.name)) return
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isFile) {
      const file = await readFile(entry as FileSystemFileEntry)
      out.push({ path, data: new Uint8Array(await file.arrayBuffer()) })
    } else if (entry.isDirectory) {
      for (const child of await readAll(entry as FileSystemDirectoryEntry)) await walk(child, path)
    }
  }
  for (const entry of entries) {
    if (entry instanceof File) out.push({ path: entry.name, data: new Uint8Array(await entry.arrayBuffer()) })
    else await walk(entry, "")
  }
  return out
}
