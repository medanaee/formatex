import { AppLogo } from "@/components/common/AppLogo"
import { fileIconName } from "@/lib/editor/fileIcons"
import { FORMATEX_DIR } from "@/lib/projects/paths"
import { cn } from "@/lib/utils"

/** The SVGs of the icon set (Material Icon Theme, MIT; the license is in the folder), as URLs by file name. */
const ICONS = import.meta.glob<string>("/src/assets/file-icons/*.svg", { eager: true, query: "?url", import: "default" })
const urlOf = (name: string): string | undefined => ICONS[`/src/assets/file-icons/${name}.svg`]

/** The icon of a file or folder of a project, by its name and kind; the project's own `.formatex` folder wears the Formatex mark. */
export function FileIcon({ path, kind, open = false, size = 16, className }: { path: string; kind: "file" | "dir"; open?: boolean; size?: number; className?: string }) {
  if (path === FORMATEX_DIR) return <AppLogo size={size} className={className} />
  const url = urlOf(fileIconName(path, kind, open)) ?? urlOf("file")
  return <img src={url} width={size} height={size} alt="" aria-hidden="true" draggable={false} className={cn("shrink-0 select-none", className)} />
}
