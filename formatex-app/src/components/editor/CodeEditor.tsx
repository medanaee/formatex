import { useEffect, useRef, useState } from "react"
import { autocompletion, completionKeymap } from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap, indentWithTab, redoDepth, undoDepth } from "@codemirror/commands"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { StreamLanguage } from "@codemirror/language"
import { toml } from "@codemirror/legacy-modes/mode/toml"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { Annotation, Compartment, EditorState, Transaction, type Extension } from "@codemirror/state"
import { drawSelection, EditorView, highlightActiveLine, keymap, lineNumbers, placeholder as placeholderExtension } from "@codemirror/view"
import { useTranslation } from "react-i18next"
import { overrideGutter, overrideInfo, overrideLabel, setFrontMatter, type OverrideRequest } from "@/lib/editor/overrideGutter"
import type { FrontMatterEntry } from "@/lib/editor/overrides"
import { toggleWrap } from "@/lib/editor/format"
import { insertTag, TAG_DRAG_TYPE } from "@/lib/editor/insertTag"
import { frontMatterMount } from "@/components/editor/frontMatterMount"
import { bidiIsolate } from "@/lib/editor/bidiIsolate"
import { colorSwatches, type ColorRequest } from "@/lib/editor/colorSwatches"
import { livePreview, type ConfigureRequest } from "@/lib/editor/livePreview"
import { minimap, minimapTheme } from "@/lib/editor/minimap"
import { problemExtension, setProblems, type Problem } from "@/lib/editor/problems"
import { stickyHeadings, stickyTheme } from "@/lib/editor/stickyHeadings"
import { completionSource } from "@/lib/editor/completionSource"
import { codeLanguageFor } from "@/lib/editor/codeLanguages"
import { typstLanguage } from "@/lib/editor/typstLanguage"
import { editorHighlighting, editorTheme } from "@/lib/editor/theme"
import type { FileKind } from "@/lib/projects"
import { cn } from "@/lib/utils"
import { useEditorViewStore } from "@/stores/useEditorViewStore"
import { useSchemaStore } from "@/stores/useSchemaStore"

/** Marks a change that came from outside (a rename, a reload): it is not reported back as an edit. */
const External = Annotation.define<boolean>()

export interface RevealRequest {
  path: string
  line: number
  column: number
  /** Changes on every request, so asking for the same place twice still scrolls. */
  id: number
}

interface CodeEditorProps {
  /** Identifies the file; each file keeps its own cursor, scroll and undo history while it is open. */
  path: string
  value: string
  kind: FileKind
  onChange: (text: string) => void
  /** Project files, offered when an attribute takes a path. */
  files?: readonly string[]
  reveal?: RevealRequest | null
  placeholder?: string
  lineNumbers?: boolean
  /** The main editor of the page: the format bar and undo / redo act on it. */
  primary?: boolean
  /** Draw Markdown like the result (live preview); the settings gears call `onConfigure`. */
  visual?: boolean
  onConfigure?: (request: ConfigureRequest) => void
  /** A miniature of the whole text at the side (a wide screen). */
  minimap?: boolean
  /** A color swatch was clicked, or a `#` was typed where a color goes. */
  onPickColor?: (request: ColorRequest) => void
  /** `config.toml` only: the settings the main document sets in its front matter; their lines get an info mark in the gutter. */
  frontMatter?: readonly FrontMatterEntry[]
  /** The info mark was hovered or tapped. */
  onOverrideInfo?: (request: OverrideRequest) => void
  /** Lines to mark as wrong (the compiler's problems in this file); they are also drawn in the minimap. */
  problems?: readonly Problem[]
  /** Base direction: "auto" lets every line follow its own first letter; "rtl" / "ltr" force it on the whole editor. */
  direction?: "auto" | "rtl" | "ltr"
  className?: string
}

/** Tells the toolbars whether undo and redo have anything to do. */
function publishHistory(state: EditorState): void {
  const canUndo = undoDepth(state) > 0
  const canRedo = redoDepth(state) > 0
  const current = useEditorViewStore.getState()
  if (current.canUndo !== canUndo || current.canRedo !== canRedo) current.set({ canUndo, canRedo })
}

function languageFor(kind: FileKind, path: string): Extension {
  if (kind === "markdown") return markdown({ base: markdownLanguage })
  if (kind === "toml") return StreamLanguage.define(toml)
  if (kind === "typst") return typstLanguage
  if (kind === "code") return codeLanguageFor(path)
  return []
}

/**
 * CodeMirror 6 with the engine's autocomplete. Text in either direction: each line takes the direction of its own first strong
 * letter, so a Persian paragraph and an English one in the same file both read correctly.
 */
export function CodeEditor({ path, value, kind, onChange, files, reveal, placeholder, lineNumbers: showLineNumbers = true, primary = false, visual = false, minimap: showMinimap = false, onConfigure, onPickColor, onOverrideInfo, frontMatter, problems, direction = "auto", className }: CodeEditorProps) {
  const { t, i18n } = useTranslation()
  // The tags autocomplete knows: the built-in ones and the user's components (the app refreshes it when a component changes)
  const schema = useSchemaStore((state) => state.schema)
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const states = useRef(new Map<string, EditorState>())
  const current = useRef({ path, kind })

  // The newest props, read by callbacks the editor keeps for its whole life
  const latest = useRef({ onChange, files, language: i18n.language, schema, primary, onConfigure, onPickColor, onOverrideInfo, frontMatter, markLabel: t("overrides.mark") })
  latest.current = { onChange, files, language: i18n.language, schema, primary, onConfigure, onPickColor, onOverrideInfo, frontMatter, markLabel: t("overrides.mark") }
  // The direction too: switched without rebuilding. Forced, the whole editor (gutter included) takes that direction
  const [dir] = useState(() => new Compartment())
  // Only Markdown is prose: settings and code files (config.toml, Typst) are always left-to-right, whatever the setting says
  const dirExtension = (setting: "auto" | "rtl" | "ltr", fileKind: FileKind): Extension => {
    const value = fileKind === "markdown" ? setting : "ltr"
    return value === "auto" ? EditorView.perLineTextDirection.of(true) : [EditorView.perLineTextDirection.of(false), EditorView.editorAttributes.of({ dir: value })]
  }
  // The live preview is switched on and off without rebuilding the editor
  const [live] = useState(() => new Compartment())
  const liveExtension = (fileKind: FileKind, on: boolean): Extension =>
    on && fileKind === "markdown" ? livePreview(() => latest.current.schema, (request) => latest.current.onConfigure?.(request), frontMatterMount) : []

  const createState = (doc: string, fileKind: FileKind, filePath: string) =>
    EditorState.create({
      doc,
      extensions: [
        showLineNumbers ? lineNumbers() : [],
        history(),
        drawSelection(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        EditorView.lineWrapping,
        dir.of(dirExtension(direction, fileKind)),
        EditorView.contentAttributes.of({ spellcheck: "false", autocorrect: "off", autocapitalize: "off" }),
        placeholder ? placeholderExtension(placeholder) : [],
        languageFor(fileKind, filePath),
        live.of(liveExtension(fileKind, visual)),
        colorSwatches((request) => latest.current.onPickColor?.(request)),
        // The headings above the first visible line stay pinned, and the whole text is a miniature at the side
        fileKind === "markdown" ? [stickyHeadings, stickyTheme, bidiIsolate] : [],
        problemExtension,
        // The settings of config.toml the main document overrides
        fileKind === "toml" ? [overrideGutter, overrideInfo.of((request) => latest.current.onOverrideInfo?.(request)), overrideLabel.of(latest.current.markLabel)] : [],
        showMinimap ? [minimap, minimapTheme] : [],
        // A tile of the tag palette dropped into the text writes that tag where it landed
        EditorView.domEventHandlers({
          dragover: (event) => {
            if (!event.dataTransfer?.types.includes(TAG_DRAG_TYPE)) return false
            event.preventDefault()
            return true
          },
          drop: (event, view) => {
            const name = event.dataTransfer?.getData(TAG_DRAG_TYPE)
            if (!name) return false
            event.preventDefault()
            const position = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.head
            insertTag(view, name, latest.current.schema, position)
            return true
          },
        }),
        fileKind === "markdown" || fileKind === "toml"
          ? autocompletion({
              override: [completionSource(() => ({ schema: latest.current.schema, language: latest.current.language, files: latest.current.files }), fileKind)],
              icons: false,
            })
          : [],
        keymap.of([
          ...(fileKind === "markdown"
            ? [
                { key: "Mod-b", run: (view: EditorView) => toggleWrap(view, "**") },
                { key: "Mod-i", run: (view: EditorView) => toggleWrap(view, "*") },
              ]
            : []),
          ...completionKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...defaultKeymap,
          indentWithTab,
        ]),
        editorTheme,
        editorHighlighting,
        EditorView.updateListener.of((update) => {
          if (latest.current.primary) publishHistory(update.state)
          if (update.docChanged && !update.transactions.some((transaction) => transaction.annotation(External))) {
            latest.current.onChange(update.state.doc.toString())
          }
        }),
      ],
    })

  // Create the view once
  useEffect(() => {
    const editor = new EditorView({ state: createState(value, kind, path), parent: host.current! })
    view.current = editor
    if (latest.current.primary) {
      useEditorViewStore.getState().set({ view: editor })
      publishHistory(editor.state)
    }
    const cache = states.current
    return () => {
      if (useEditorViewStore.getState().view === editor) useEditorViewStore.getState().set({ view: null, canUndo: false, canRedo: false })
      editor.destroy()
      view.current = null
      cache.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the view is created once; later props flow through effects below
  }, [])

  useEffect(() => {
    view.current?.dispatch({ effects: live.reconfigure(liveExtension(current.current.kind, visual)) })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the mode switches the preview
  }, [visual])

  useEffect(() => {
    view.current?.dispatch({ effects: dir.reconfigure(dirExtension(direction, current.current.kind)) })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the setting switches the direction
  }, [direction])

  // Another file: keep the old one's state, restore or build the new one's
  useEffect(() => {
    const editor = view.current
    if (!editor || current.current.path === path) return
    states.current.set(current.current.path, editor.state)
    current.current = { path, kind }
    editor.setState(states.current.get(path) ?? createState(value, kind, path))
    editor.dispatch({ effects: [live.reconfigure(liveExtension(kind, visual)), dir.reconfigure(dirExtension(direction, kind))] })
    if (latest.current.primary) publishHistory(editor.state)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a different file replaces the state
  }, [path])

  // The overridden settings of config.toml are marked; another file brings its own state, so they are set again with it
  useEffect(() => {
    if (kind === "toml") view.current?.dispatch({ effects: setFrontMatter.of(frontMatter ?? []) })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `path` too: a state built for another file starts without marks
  }, [frontMatter, path, kind])

  // The compiler's problems of this file are marked; another file brings its own state, so they are set again with it
  useEffect(() => {
    view.current?.dispatch({ effects: setProblems.of(problems ?? []) })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `path` too: a state built for another file starts without marks
  }, [problems, path])

  // The text changed outside the editor (rename, reload)
  useEffect(() => {
    const editor = view.current
    if (!editor || editor.state.doc.toString() === value) return
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      annotations: [External.of(true), Transaction.addToHistory.of(false)],
    })
  }, [value])

  // Go to a position (a click on a problem)
  useEffect(() => {
    const editor = view.current
    if (!reveal || reveal.path !== path || !editor) return
    const line = editor.state.doc.line(Math.min(Math.max(reveal.line, 1), editor.state.doc.lines))
    const position = Math.min(line.from + Math.max(reveal.column - 1, 0), line.to)
    editor.dispatch({ selection: { anchor: position }, effects: EditorView.scrollIntoView(position, { y: "center" }) })
    editor.focus()
  }, [reveal, path])

  return <div ref={host} className={cn("h-full min-h-0 min-w-0 overflow-hidden", className)} />
}
