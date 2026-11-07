import { useState, type ReactNode } from "react"
import { Check, FileCode2, FileText, FolderOpen, HardDrive } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ResponsiveDialog } from "@/components/common/ResponsiveDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ProjectKind } from "@/lib/db/types"
import { canUseFolders, folderName, pickFolder, scanFolder } from "@/lib/projects/storageMode"
import { cn } from "@/lib/utils"

/** Where a new project keeps its files: the app's storage, or a folder of the user (an existing one is opened as it is). */
export interface StorageChoice {
  storage: "local" | "folder"
  folder: string | null
  /** The Markdown files of the folder, when it is not a Formatex project yet. */
  markdown: string[]
  /** The Typst files of the folder. */
  typst: string[]
  /** The Markdown file a Formatex project typesets; `""` creates a new main.md. */
  main: string
  /** The Typst file a plain Typst project compiles; `""` is none yet. */
  typstMain: string
  /** The folder has `.formatex/config.toml` already: nothing is asked about it. */
  isProject: boolean
}

export const LOCAL_CHOICE: StorageChoice = { storage: "local", folder: null, markdown: [], typst: [], main: "", typstMain: "", isProject: false }

export interface NewProject {
  title: string
  kind: ProjectKind
  choice: StorageChoice
}

const NEW_MAIN = "__new__"
const NO_MAIN = "__none__"

interface CardOption<T extends string> {
  value: T
  icon: ReactNode
  title: string
  hint: string
}

/** A few big choices side by side, each with a line that says what it means: one is chosen (a radio group). */
function OptionCards<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: CardOption<T>[]; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const chosen = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={chosen}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex min-h-[4.5rem] flex-col items-start gap-1 rounded-xl border p-3 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              chosen ? "border-primary bg-accent" : "border-border hover:bg-muted"
            )}
          >
            <span className="flex w-full items-center gap-2 text-[13px] font-medium">
              <span className="text-muted-foreground [&_svg]:size-4">{option.icon}</span>
              <span className="min-w-0 flex-1 truncate">{option.title}</span>
              {chosen && <Check className="size-3.5 shrink-0 text-primary" />}
            </span>
            <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{option.hint}</span>
          </button>
        )
      })}
    </div>
  )
}

function FolderChoice({ kind, value, onChange }: { kind: ProjectKind; value: StorageChoice; onChange: (value: StorageChoice) => void }) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  const choose = async () => {
    setError(null)
    try {
      const folder = await pickFolder()
      if (!folder) return
      // The folder counts as chosen even if listing it fails: it is opened (and listed) again when the project is created
      onChange({ ...value, folder, isProject: false, markdown: [], typst: [], main: "", typstMain: "" })
      const scan = await scanFolder(folder)
      const typst = scan.files.filter((entry) => entry.kind === "file" && entry.path.endsWith(".typ")).map((entry) => entry.path)
      onChange({
        ...value,
        folder,
        isProject: scan.isProject,
        markdown: scan.markdown,
        typst,
        main: scan.markdown.includes("main.md") ? "main.md" : (scan.markdown[0] ?? ""),
        typstMain: typst.includes("main.typ") ? "main.typ" : "",
      })
    } catch (cause) {
      setError(String(cause))
    }
  }

  const files = kind === "typst" ? value.typst : value.markdown
  const current = kind === "typst" ? value.typstMain : value.main
  const none = kind === "typst" ? NO_MAIN : NEW_MAIN
  return (
    <div className="grid gap-2 rounded-xl border border-dashed border-border p-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => void choose()}>
          {value.folder ? t("storage.changeFolder") : t("storage.chooseFolder")}
        </Button>
        <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground" title={value.folder ?? undefined}>
          {value.folder ? folderName(value.folder) : t("storage.noFolder")}
        </span>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value.folder && (kind === "typst" || !value.isProject) && (
        <div className="grid gap-1">
          <Label className="text-[11px] font-normal text-muted-foreground">{t("storage.mainFile")}</Label>
          <Select
            value={current || none}
            onValueChange={(next) => onChange(kind === "typst" ? { ...value, typstMain: next === NO_MAIN ? "" : next } : { ...value, main: next === NEW_MAIN ? "" : next })}
          >
            <SelectTrigger className="h-9 w-full text-xs" dir="ltr" aria-label={t("storage.mainFile")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {files.map((file) => (
                  <SelectItem key={file} value={file} className="text-xs">
                    {file}
                  </SelectItem>
                ))}
                <SelectItem value={none} className="text-xs text-muted-foreground">
                  {kind === "typst" ? t("kind.noMain") : t("storage.newMain")}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (project: NewProject) => void
}

/** The dialog that makes a project: its name, what it is (Formatex, or plain Typst), and where its files live. */
export function NewProjectDialog({ open, onClose, onCreate }: NewProjectDialogProps) {
  // Mounted only while open, so every opening starts from the defaults
  return open ? <Form onClose={onClose} onCreate={onCreate} /> : null
}

function Form({ onClose, onCreate }: Omit<NewProjectDialogProps, "open">) {
  const { t } = useTranslation()
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState<ProjectKind>("formatex")
  const [choice, setChoice] = useState<StorageChoice>(LOCAL_CHOICE)
  const folders = canUseFolders()
  const ready = choice.storage === "local" || Boolean(choice.folder)
  const create = () => ready && onCreate({ title: title.trim(), kind, choice })

  return (
    <ResponsiveDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={t("library.new")}
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="lg" disabled={!ready} onClick={create}>
            {t("common.create")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="new-project-name">{t("library.titleLabel")}</Label>
          <Input id="new-project-name" dir="auto" autoFocus value={title} placeholder={t("library.untitled")} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && create()} className="h-10" />
        </div>

        <div className="grid gap-1.5">
          <Label asChild>
            <span>{t("kind.title")}</span>
          </Label>
          <OptionCards
            label={t("kind.title")}
            value={kind}
            onChange={setKind}
            options={[
              { value: "formatex", icon: <FileText />, title: t("kind.formatex"), hint: t("kind.formatexHint") },
              { value: "typst", icon: <FileCode2 />, title: t("kind.typst"), hint: t("kind.typstHint") },
            ]}
          />
        </div>

        {folders && (
          <div className="grid gap-1.5">
            <Label asChild>
              <span>{t("storage.label")}</span>
            </Label>
            <OptionCards
              label={t("storage.label")}
              value={choice.storage}
              onChange={(storage) => setChoice({ ...choice, storage })}
              options={[
                { value: "local", icon: <HardDrive />, title: t("storage.local"), hint: t("storage.localHint") },
                { value: "folder", icon: <FolderOpen />, title: t("storage.folder"), hint: t("storage.folderHint") },
              ]}
            />
            {choice.storage === "folder" && <FolderChoice kind={kind} value={choice} onChange={setChoice} />}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  )
}
