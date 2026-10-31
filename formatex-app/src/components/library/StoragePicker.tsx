import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { folderName, pickFolder, scanFolder } from "@/lib/projects/storageMode"

/** Where a new project keeps its files: the app's storage, or a folder of the user (an existing one is opened as it is). */
export interface StorageChoice {
  storage: "local" | "folder"
  folder: string | null
  /** The Markdown files of the folder, when it is not a Formatex project yet. */
  markdown: string[]
  /** The Markdown file the project typesets; `""` creates a new main.md. */
  main: string
  /** The folder has `.formatex/config.toml` already: nothing is asked about it. */
  isProject: boolean
}

export const LOCAL_CHOICE: StorageChoice = { storage: "local", folder: null, markdown: [], main: "", isProject: false }

const NEW_MAIN = "__new__"

export function StoragePicker({ value, onChange }: { value: StorageChoice; onChange: (value: StorageChoice) => void }) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  const choose = async () => {
    setError(null)
    try {
      const folder = await pickFolder()
      if (!folder) return
      // The folder counts as chosen even if listing it fails: it is opened (and listed) again when the project is created
      onChange({ ...value, folder, isProject: false, markdown: [], main: "" })
      const scan = await scanFolder(folder)
      onChange({ ...value, folder, isProject: scan.isProject, markdown: scan.markdown, main: scan.markdown.includes("main.md") ? "main.md" : (scan.markdown[0] ?? "") })
    } catch (cause) {
      setError(String(cause))
    }
  }

  return (
    <div className="grid gap-2">
      <SegmentedControl
        label={t("storage.label")}
        value={value.storage}
        onValueChange={(storage) => onChange({ ...value, storage })}
        options={[
          { value: "local", label: t("storage.local") },
          { value: "folder", label: t("storage.folder") },
        ]}
      />
      {value.storage === "folder" && (
        <>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void choose()}>
              {value.folder ? t("storage.changeFolder") : t("storage.chooseFolder")}
            </Button>
            <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground" title={value.folder ?? undefined}>
              {value.folder ? folderName(value.folder) : t("storage.noFolder")}
            </span>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {value.folder && !value.isProject && (
            <Select value={value.main || NEW_MAIN} onValueChange={(next) => onChange({ ...value, main: next === NEW_MAIN ? "" : next })}>
              <SelectTrigger className="h-9 w-full text-xs" dir="ltr" aria-label={t("storage.mainFile")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {value.markdown.map((file) => (
                    <SelectItem key={file} value={file} className="text-xs">
                      {file}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_MAIN} className="text-xs text-muted-foreground">
                    {t("storage.newMain")}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </>
      )}
    </div>
  )
}
