import { useLibraryStore } from "@/stores/useLibraryStore"
import type { ProjectKind } from "@/lib/db/types"
import { sourceOf, withSource } from "./configSource"
import { DEFAULT_CONFIG, openProjectFs } from "./index"
import { CONFIG_FILE, DEFAULT_MAIN_FILE } from "./paths"
import starterMain from "../../../templates/main.md?raw"

/** The first files of a plain Typst project that lives in the app's own storage: an empty template, and a main file that only uses it. */
export const TYPST_MAIN_FILE = "main.typ"
export const TYPST_TEMPLATE_FILE = "template.typ"
const TEMPLATE = "#let template(doc) = {\n  doc\n}\n"
const MAIN = `#import "${TYPST_TEMPLATE_FILE}": template\n#show: template\n`

/** Writes the first files of a plain Typst project in the app's own storage. A project in a folder of the user's gets none. */
export async function initTypstProject(projectId: string): Promise<void> {
  const fs = await openProjectFs(projectId)
  if (!(await fs.exists(TYPST_TEMPLATE_FILE))) await fs.writeText(TYPST_TEMPLATE_FILE, TEMPLATE)
  if (!(await fs.exists(TYPST_MAIN_FILE))) await fs.writeText(TYPST_MAIN_FILE, MAIN)
}

/**
 * What a Formatex project needs and the project lacks, made: `config.toml` (in a folder of the user's it is `.formatex/config.toml`;
 * the file system puts it there) and the starter `main.md` it names. What is there already is left as it is. Returns the file to typeset
 * (the `source` of the config, which may be none).
 */
export async function ensureFormatexFiles(projectId: string, inFolder: boolean): Promise<string> {
  const fs = await openProjectFs(projectId)
  if (await fs.exists(CONFIG_FILE)) return sourceOf(await fs.readText(CONFIG_FILE))?.path ?? ""
  await fs.writeText(CONFIG_FILE, withSource(DEFAULT_CONFIG, DEFAULT_MAIN_FILE))
  if (!(await fs.exists(DEFAULT_MAIN_FILE))) await fs.writeText(DEFAULT_MAIN_FILE, starterMain)
  // The app's own storage keeps its images in a folder of its own; a folder of the user's gets nothing it did not have
  if (!inFolder) await fs.createDir("images").catch(() => undefined)
  return DEFAULT_MAIN_FILE
}

/**
 * Changes what a project is. The files are not touched, except that going to Formatex makes the ones it needs and the project lacks.
 * Going to plain Typst leaves the Markdown files and `config.toml` where they are; no file is the main one until one is chosen.
 */
export async function changeProjectKind(projectId: string, kind: ProjectKind): Promise<void> {
  const library = useLibraryStore.getState()
  const doc = library.documents.find((item) => item.id === projectId)
  if (!doc || (doc.kind ?? "formatex") === kind) return
  if (kind === "typst") {
    library.setKind(projectId, "typst", "")
    return
  }
  const main = await ensureFormatexFiles(projectId, Boolean(doc.location))
  library.setKind(projectId, "formatex", main || DEFAULT_MAIN_FILE)
}
