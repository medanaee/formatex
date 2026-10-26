import { reloadFonts } from "@/lib/compiler"
import { isTauri } from "@/lib/platform"
import { pickFiles } from "./saveFile"

const FONT_EXTENSIONS = ["ttf", "otf", "ttc"]

/**
 * Imports font files into the app (`$APPDATA/fonts`), where the compiler finds them. This is how Android gets its fonts; on
 * desktop the operating system's own fonts are read as well, and imported ones win when a name appears in both.
 * Returns how many fonts were imported.
 */
export async function importFonts(): Promise<number> {
  if (!isTauri()) return 0
  const files = await pickFiles({ extensions: FONT_EXTENSIONS })
  if (files.length === 0) return 0
  const { mkdir, writeFile, BaseDirectory } = await import("@tauri-apps/plugin-fs")
  const options = { baseDir: BaseDirectory.AppData }
  await mkdir("fonts", { ...options, recursive: true })
  for (const file of files) await writeFile(`fonts/${file.name}`, file.data, options)
  await reloadFonts()
  return files.length
}

/** Names of the files in the app's fonts folder. */
export async function importedFontFiles(): Promise<string[]> {
  if (!isTauri()) return []
  const { readDir, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs")
  const options = { baseDir: BaseDirectory.AppData }
  if (!(await exists("fonts", options))) return []
  return (await readDir("fonts", options)).filter((entry) => entry.isFile).map((entry) => entry.name)
}

export async function removeImportedFont(fileName: string): Promise<void> {
  const { remove, BaseDirectory } = await import("@tauri-apps/plugin-fs")
  await remove(`fonts/${fileName}`, { baseDir: BaseDirectory.AppData })
  await reloadFonts()
}
