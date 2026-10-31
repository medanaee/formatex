import { baseName, CONFIG_FILE, extensionOf, parentOf, joinPath, type FsEntry } from "./paths"
import { sourceOf, withSource } from "./configSource"

/**
 * Pure planning of moving a project between the app's storage and a folder of the user's: which files are copied, which of them
 * would replace a file that is already there, and what the copied `config.toml` says.
 */

export type Resolution = "replace" | "skip" | "both"

export interface MovePlan {
  /** Folders to create, parents first. */
  dirs: string[]
  /** Files to copy. */
  files: string[]
  /** Files that exist on both sides (the ones that need an answer). */
  conflicts: string[]
}

/** What to copy from `source` into a place that already has `target`. With `only`, just those files (and the folders above them). */
export function planMove(source: readonly FsEntry[], target: readonly FsEntry[], only?: ReadonlySet<string>): MovePlan {
  const have = new Set(target.filter((entry) => entry.kind === "file").map((entry) => entry.path))
  const files = source.filter((entry) => entry.kind === "file" && (!only || only.has(entry.path))).map((entry) => entry.path)
  const dirs = new Set<string>()
  for (const file of files) {
    for (let dir = parentOf(file); dir; dir = parentOf(dir)) dirs.add(dir)
  }
  if (!only) for (const entry of source) if (entry.kind === "dir") dirs.add(entry.path)
  return {
    dirs: [...dirs].sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b)),
    files,
    conflicts: files.filter((file) => have.has(file)),
  }
}

/** `notes.md` to `notes (2).md`: the first name next to it that is not taken. */
export function copyName(path: string, taken: ReadonlySet<string>): string {
  const name = baseName(path)
  const extension = extensionOf(path)
  const stem = extension ? name.slice(0, -(extension.length + 1)) : name
  for (let n = 2; ; n++) {
    const candidate = joinPath(parentOf(path), `${stem} (${n})${extension ? `.${extension}` : ""}`)
    if (!taken.has(candidate)) return candidate
  }
}

/** Where each file goes, by the answers given: replaced ones keep their path, skipped ones are left out, "both" gets a new name. */
export function destinations(plan: MovePlan, target: readonly FsEntry[], answers: Readonly<Record<string, Resolution>>): Map<string, string> {
  const taken = new Set(target.map((entry) => entry.path))
  const out = new Map<string, string>()
  for (const file of plan.files) {
    if (!plan.conflicts.includes(file)) {
      out.set(file, file)
      continue
    }
    // config.toml has one place in a folder (.formatex/), so it cannot be kept twice
    const answer = file === CONFIG_FILE && answers[file] === "both" ? "skip" : (answers[file] ?? "skip")
    if (answer === "replace") out.set(file, file)
    else if (answer === "both") {
      const name = copyName(file, taken)
      taken.add(name)
      out.set(file, name)
    }
  }
  return out
}

/** The `config.toml` a project takes along when it leaves a folder: its `source` stays only if that file is copied too. */
export function configForCopy(config: string, copied: ReadonlySet<string>): string {
  const source = sourceOf(config)?.path
  return source && !copied.has(source) ? withSource(config, "") : config
}

/** The Markdown files at the top of a folder, for choosing the document of a folder project. */
export const markdownFiles = (entries: readonly FsEntry[]): string[] => entries.filter((entry) => entry.kind === "file" && !entry.path.includes("/") && entry.path !== CONFIG_FILE && /\.(md|markdown)$/i.test(entry.path)).map((entry) => entry.path)
