import type { FsEntry } from "./paths"

/**
 * The files of one project, as the editor sees them. Paths are project-relative with `/` separators. The app backs it with
 * real files (`$APPDATA/documents/<id>/`, which the native Typst compiler reads); a browser backs it with localStorage.
 */
export interface ProjectFs {
  /** Every file and folder, recursively, in display order. */
  list(): Promise<FsEntry[]>
  readText(path: string): Promise<string>
  readBytes(path: string): Promise<Uint8Array>
  /** Writes the file, creating the folders above it. */
  writeText(path: string, text: string): Promise<void>
  writeBytes(path: string, data: Uint8Array): Promise<void>
  createDir(path: string): Promise<void>
  /** A file, or a folder with everything in it. */
  remove(path: string): Promise<void>
  rename(from: string, to: string): Promise<void>
  exists(path: string): Promise<boolean>
}
