import { baseName, extensionOf, CONFIG_FILE, FORMATEX_CONFIG } from "@/lib/projects/paths"

/**
 * Which icon of the file icon set (Material Icon Theme, MIT: `src/assets/file-icons/`) a file or folder of a project gets. Pure: the
 * name is the SVG's file name without `.svg`; `FileIcon` draws it.
 */

const BY_EXTENSION: Record<string, string> = {
  md: "markdown", markdown: "markdown", toml: "toml", typ: "typst", txt: "document", json: "json", csv: "table", bib: "bibliography",
  yml: "yaml", yaml: "yaml", html: "html", svg: "svg", pdf: "pdf", zip: "zip",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", bmp: "image",
  ttf: "font", otf: "font", ttc: "font", woff: "font", woff2: "font",
  py: "python", pyw: "python", js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "react", ts: "typescript", tsx: "react_ts",
  c: "c", h: "h", cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "hpp", hh: "hpp", java: "java", cs: "csharp", kt: "kotlin", kts: "kotlin",
  scala: "scala", swift: "swift", dart: "dart", go: "go", rs: "rust", rb: "ruby", php: "php", pl: "perl", pm: "perl", lua: "lua",
  r: "r", jl: "julia", hs: "haskell", sql: "database", sh: "console", bash: "console", zsh: "console", bat: "console", cmd: "console",
  ps1: "powershell", css: "css", scss: "sass", less: "less", xml: "xml", ini: "settings", cfg: "settings", conf: "settings",
  properties: "settings", diff: "diff", patch: "diff", cmake: "cmake", gradle: "gradle", m: "matlab", mm: "objective-cpp", asm: "assembly",
  tex: "tex", log: "log",
}

const BY_NAME: Record<string, string> = {
  dockerfile: "docker", makefile: "console", license: "license", "license.md": "license", "readme.md": "readme", readme: "readme",
  ".gitignore": "git", ".gitattributes": "git",
}

/** Folders that have an icon of their own. */
const FOLDERS: Record<string, string> = {
  images: "folder-images", image: "folder-images", img: "folder-images", assets: "folder-images", fonts: "folder-font", font: "folder-font",
  src: "folder-src", docs: "folder-docs", doc: "folder-docs", config: "folder-config",
}

/** The icon for a path; `kind` says whether it is a folder (then `open` picks the open one). */
export function fileIconName(path: string, kind: "file" | "dir", open = false): string {
  if (kind === "dir") {
    const name = FOLDERS[baseName(path).toLowerCase()] ?? "folder"
    return open ? `${name}-open` : name
  }
  if (path === CONFIG_FILE || path === FORMATEX_CONFIG) return "settings"
  const name = baseName(path).toLowerCase()
  return BY_NAME[name] ?? BY_EXTENSION[extensionOf(path)] ?? "file"
}
