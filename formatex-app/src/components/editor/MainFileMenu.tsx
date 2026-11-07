import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { fileKindOf } from "@/lib/projects"
import { useEditorStore } from "@/stores/useEditorStore"

const NONE = "__none__"

/** The radio items of the main file: none, and every `.typ` file of the project. Chosen, it is the file Typst compiles. */
export function MainFileItems() {
  const { t } = useTranslation()
  const files = useEditorStore((state) => state.files)
  const mainFile = useEditorStore((state) => state.mainFile)
  const typst = files.filter((entry) => entry.kind === "file" && !entry.alias && fileKindOf(entry.path) === "typst").map((entry) => entry.path)
  return (
    <DropdownMenuRadioGroup value={mainFile || NONE} onValueChange={(next) => useEditorStore.getState().setMainFile(next === NONE ? "" : next)}>
      <DropdownMenuRadioItem value={NONE}>{t("kind.noMain")}</DropdownMenuRadioItem>
      {typst.length > 0 && <DropdownMenuSeparator />}
      {typst.map((path) => (
        <DropdownMenuRadioItem key={path} value={path}>
          <span dir="ltr" className="truncate">{path}</span>
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

/** The menu of the main file around a trigger (the settings button of a plain Typst project: it has no config.toml to open). */
export function MainFileMenu({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 min-w-48">
        <DropdownMenuLabel>{t("kind.mainFile")}</DropdownMenuLabel>
        <MainFileItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
