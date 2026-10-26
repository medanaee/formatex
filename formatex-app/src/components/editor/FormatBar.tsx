import { useState, type ReactNode } from "react"
import { startCompletion } from "@codemirror/autocomplete"
import {
  Bold,
  ChevronDown,
  Code,
  Code2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Tags,
  Undo2,
} from "lucide-react"
import { redo, undo } from "@codemirror/commands"
import type { EditorView } from "@codemirror/view"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { insertCodeBlock, insertLink, insertTable, insertText, setHeading, toggleBullets, toggleNumbers, toggleQuote, toggleWrap } from "@/lib/editor/format"
import { desktopOs } from "@/lib/platform"
import { CONFIG_FILE, fileKindOf } from "@/lib/projects"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/useEditorStore"
import { useEditorViewStore } from "@/stores/useEditorViewStore"

function Tool({ label, shortcut, onClick, disabled, children }: { label: string; shortcut?: string; onClick?: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      // The editor keeps its focus and selection while a tool is used
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="shrink-0 text-muted-foreground hover:text-foreground"
    >
      {children}
    </Button>
  )
}

const Divider = () => <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden="true" />

/** Rows and columns of a new table; the table goes in at the cursor. */
function TableTool({ run }: { run: (rows: number, columns: number) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(2)
  const [columns, setColumns] = useState(3)
  const clamp = (value: string) => Math.min(Math.max(Number.parseInt(value, 10) || 1, 1), 20)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-lg" title={t("format.table")} aria-label={t("format.table")} onMouseDown={(event) => event.preventDefault()} className="shrink-0 text-muted-foreground hover:text-foreground">
          <Table2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 gap-2 p-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="grid gap-1">
            {t("format.rows")}
            <Input type="number" min={1} max={20} value={rows} onChange={(event) => setRows(clamp(event.target.value))} className="h-9" />
          </label>
          <label className="grid gap-1">
            {t("format.columns")}
            <Input type="number" min={1} max={20} value={columns} onChange={(event) => setColumns(clamp(event.target.value))} className="h-9" />
          </label>
        </div>
        <Button
          size="lg"
          onClick={() => {
            run(rows, columns)
            setOpen(false)
          }}
        >
          {t("format.insert")}
        </Button>
      </PopoverContent>
    </Popover>
  )
}

/**
 * The bar above the editor: undo / redo for every text file, and for Markdown the formatting tools (bold, italic, headings,
 * lists, quote, link, table, code, and a button that opens the tag suggestions). It scrolls sideways on a narrow screen.
 */
export function FormatBar() {
  const { t } = useTranslation()
  const activePath = useEditorStore((state) => state.activePath)
  const view = useEditorViewStore((state) => state.view)
  const canUndo = useEditorViewStore((state) => state.canUndo)
  const canRedo = useEditorViewStore((state) => state.canRedo)
  const visual = useSettingsStore((state) => state.visualEditor)
  const setVisual = useSettingsStore((state) => state.setVisualEditor)
  const direction = useSettingsStore((state) => state.editorDirection)
  const setDirection = useSettingsStore((state) => state.setEditorDirection)

  const configVisual = useSettingsStore((state) => state.configVisual)
  const setConfigVisual = useSettingsStore((state) => state.setConfigVisual)

  if (!activePath) return null
  const isConfig = activePath === CONFIG_FILE
  // config.toml as a settings screen has no editor behind it: its bar is only the switch back to the source
  const modeSwitch = (on: boolean, set: (next: boolean) => void) => (
    <SegmentedControl
      value={on ? "visual" : "source"}
      onValueChange={(next) => set(next === "visual")}
      label={t("format.mode")}
      compact
      className="ms-auto shrink-0"
      options={[
        { value: "source", label: t("format.sourceMode") },
        { value: "visual", label: t("format.visualMode") },
      ]}
    />
  )
  if (isConfig && configVisual) {
    return (
      <div role="toolbar" aria-label={t("format.bar")} className="flex h-10 shrink-0 items-center border-b border-border bg-background px-2 select-none" dir="ltr">
        {modeSwitch(true, setConfigVisual)}
      </div>
    )
  }
  if (!view) return null
  const markdown = fileKindOf(activePath) === "markdown"
  const mod = desktopOs() === "macos" ? "⌘" : "Ctrl"
  const run = (command: (view: EditorView) => unknown) => () => {
    command(view)
  }

  return (
    <div role="toolbar" aria-label={t("format.bar")} className="flex h-10 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-background px-1 select-none [scrollbar-width:none]" dir="ltr">
      <Tool label={t("format.undo")} shortcut={`${mod}+Z`} disabled={!canUndo} onClick={run(undo)}>
        <Undo2 />
      </Tool>
      <Tool label={t("format.redo")} shortcut={`${mod}+Y`} disabled={!canRedo} onClick={run(redo)}>
        <Redo2 />
      </Tool>
      <Tool
        label={t("format.direction", { value: t(`format.dir_${direction}` as "format.dir_auto") })}
        onClick={() => setDirection(direction === "auto" ? "rtl" : direction === "rtl" ? "ltr" : "auto")}
      >
        <span className="text-[10px] font-bold leading-none">{direction === "auto" ? "A" : direction.toUpperCase()}</span>
      </Tool>
      {markdown && (
        <>
          <Divider />
          <Tool label={t("format.bold")} shortcut={`${mod}+B`} onClick={run((v) => toggleWrap(v, "**"))}>
            <Bold />
          </Tool>
          <Tool label={t("format.italic")} shortcut={`${mod}+I`} onClick={run((v) => toggleWrap(v, "*"))}>
            <Italic />
          </Tool>
          <Tool label={t("format.strike")} onClick={run((v) => toggleWrap(v, "~~"))}>
            <Strikethrough />
          </Tool>
          <Tool label={t("format.code")} onClick={run((v) => toggleWrap(v, "`"))}>
            <Code />
          </Tool>
          <Divider />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="lg" title={t("format.heading")} aria-label={t("format.heading")} onMouseDown={(event) => event.preventDefault()} className="shrink-0 gap-0.5 px-2 text-muted-foreground hover:text-foreground">
                <span className="text-xs font-semibold">H</span>
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onCloseAutoFocus={(event) => event.preventDefault()}>
              {[1, 2, 3, 4].map((level) => (
                <DropdownMenuItem key={level} onSelect={() => setHeading(view, level)}>
                  <span className={cn("font-semibold", level === 1 && "text-base", level === 2 && "text-[15px]")}>{t(`format.h${level}` as "format.h1")}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onSelect={() => setHeading(view, 0)}>{t("format.paragraph")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tool label={t("format.bullets")} onClick={run(toggleBullets)}>
            <List />
          </Tool>
          <Tool label={t("format.numbers")} onClick={run(toggleNumbers)}>
            <ListOrdered />
          </Tool>
          <Tool label={t("format.quote")} onClick={run(toggleQuote)}>
            <Quote />
          </Tool>
          <Divider />
          <Tool label={t("format.link")} onClick={run(insertLink)}>
            <Link2 />
          </Tool>
          <TableTool run={(rows, columns) => insertTable(view, rows, columns)} />
          <Tool label={t("format.codeBlock")} onClick={run(insertCodeBlock)}>
            <Code2 />
          </Tool>
          <Tool
            label={t("format.tag")}
            onClick={() => {
              // Types the `<` and opens the suggestions: the same list as typing it by hand
              insertText(view, "<")
              startCompletion(view)
            }}
          >
            <Tags />
          </Tool>
        </>
      )}
      {markdown && modeSwitch(visual, setVisual)}
      {isConfig && modeSwitch(false, setConfigVisual)}
    </div>
  )
}
