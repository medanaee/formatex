import { Package, PackageOpen } from "lucide-react"
import { AppLogo } from "@/components/common/AppLogo"
import { fileIconName } from "@/lib/editor/fileIcons"
import { FORMATEX_DIR } from "@/lib/projects/paths"
import { cn } from "@/lib/utils"

/** The SVGs of the icon set (Material Icon Theme, MIT; the license is in the folder), as URLs by file name. */
const ICONS = import.meta.glob<string>("/src/assets/file-icons/*.svg", { eager: true, query: "?url", import: "default" })
const urlOf = (name: string): string | undefined => ICONS[`/src/assets/file-icons/${name}.svg`]

/** The icon of a file or folder of a project, by its name and kind; `.formatex` wears the Formatex mark, component folders wear a package icon. */
export function FileIcon({ path, kind, open = false, isComponent = false, size = 16, className }: { path: string; kind: "file" | "dir"; open?: boolean; isComponent?: boolean; size?: number; className?: string }) {
  if (path === FORMATEX_DIR) return <AppLogo size={size} className={className} />
  if (isComponent) {
    const Icon = open ? PackageOpen : Package
    return (
      <span style={{ width: size, height: size }} aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center select-none text-primary", className)}>
        <Icon size={size * 0.9} />
      </span>
    )
  }
  const url = urlOf(fileIconName(path, kind, open)) ?? urlOf("file")
  return <img src={url} width={size} height={size} alt="" aria-hidden="true" draggable={false} className={cn("shrink-0 select-none", className)} />
}
