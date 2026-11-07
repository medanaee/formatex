import { zipSync, type Zippable } from "fflate"
import { baseName, type FsEntry } from "@/lib/projects/paths"

/** What saving a choice of files and folders writes: one file as it is, or a ZIP of everything chosen. */
export interface SavePlan {
  /** The name offered in the Save dialog. */
  name: string
  mime: string
  /** One file saved as it is; otherwise a ZIP. */
  zip: boolean
  /** The files to read, with the path each has inside the ZIP (the folders chosen are its top level). */
  items: { path: string; zipPath: string }[]
}

const MIME: Record<string, string> = {
  md: "text/markdown",
  txt: "text/plain",
  typ: "text/plain",
  toml: "application/toml",
  json: "application/json",
  csv: "text/csv",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
}

export function mimeOf(name: string): string {
  const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : ""
  return MIME[extension] ?? "application/octet-stream"
}

/**
 * Plans the Save of the chosen entries of the tree: a single file is saved as it is; a folder, or several things, as a ZIP that keeps the
 * folder names (a folder `images` gives `images/a.png`). A folder with nothing in it, and what lies inside a folder that is chosen too, is
 * left out. `null` when there is nothing to save.
 */
export function planSave(files: readonly FsEntry[], chosen: readonly string[]): SavePlan | null {
  const known = new Map(files.filter((entry) => !entry.alias).map((entry) => [entry.path, entry]))
  const paths = chosen.filter((path) => known.has(path))
  // What lies inside another chosen folder comes with that folder
  const tops = paths.filter((path) => !paths.some((other) => other !== path && known.get(other)!.kind === "dir" && path.startsWith(`${other}/`)))
  if (tops.length === 0) return null

  if (tops.length === 1 && known.get(tops[0])!.kind === "file") {
    const name = baseName(tops[0])
    return { name, mime: mimeOf(name), zip: false, items: [{ path: tops[0], zipPath: name }] }
  }

  const items: SavePlan["items"] = []
  for (const top of tops) {
    if (known.get(top)!.kind === "file") {
      items.push({ path: top, zipPath: baseName(top) })
      continue
    }
    const folder = baseName(top)
    for (const entry of known.values()) {
      if (entry.kind === "file" && entry.path.startsWith(`${top}/`)) items.push({ path: entry.path, zipPath: `${folder}/${entry.path.slice(top.length + 1)}` })
    }
  }
  if (items.length === 0) return null
  const name = tops.length === 1 ? `${baseName(tops[0])}.zip` : "files.zip"
  return { name, mime: "application/zip", zip: true, items }
}

/** The bytes of a ZIP of `items`, read by `read`. */
export async function zipItems(items: SavePlan["items"], read: (path: string) => Promise<Uint8Array>): Promise<Uint8Array> {
  const tree: Zippable = {}
  for (const item of items) tree[item.zipPath] = await read(item.path)
  return zipSync(tree)
}
