import { EditorView, WidgetType } from "@codemirror/view"
import i18n from "i18next"
import { deleteColumn, deleteRow, insertColumn, insertRow, normalizeTable, serializeTable, setCell, type ParsedTable } from "./markdownTable"

/**
 * A table of the visual editor that is edited where it stands: every cell is a text field (its Markdown while it is being edited,
 * the typeset cell otherwise), Tab and Enter move between cells, and a small bar adds and removes rows and columns at the cell you are
 * in. Every change is written back into the Markdown table (`serializeTable`), so the file stays plain text.
 */

export interface TableWidgetHooks {
  /** A cell's text as shown when it is not being edited (bold, math, ...), as HTML. */
  render: (text: string) => string
  /** The button of the table's `{...}` options. */
  gear: (view: EditorView, wrap: HTMLElement) => HTMLElement
  /** Puts the cursor in the table's Markdown. */
  source: (view: EditorView, wrap: HTMLElement) => void
}

interface Position {
  /** -1 is the header. */
  row: number
  column: number
}

interface State {
  table: ParsedTable
  /** Length of the table's text in the document (without the `{...}` line above it), kept up to date by every write. */
  length: number
  /** Length of the text before the table inside the replaced range: the `{...}` line and what lies between. */
  prefix: number
  focus: Position | null
  timer: number
}

type Wrap = HTMLElement & { __table?: State }

/** Where the cursor of a table goes after the widget was built again (adding a row replaces the widget). */
const pendingFocus = new WeakMap<EditorView, Position>()

const svg = (inner: string) => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
const GRID = '<rect x="5" y="6" width="14" height="12" rx="1.5"/><path d="M5 12h14M12 6v12"/>'
const ICONS = {
  rowAbove: svg(`${GRID}<path d="M12 1.5v3M10.5 3h3"/>`),
  rowBelow: svg(`${GRID}<path d="M12 19.5v3M10.5 21h3"/>`),
  columnBefore: svg(`${GRID}<path d="M1.5 12h3M3 10.5v3"/>`),
  columnAfter: svg(`${GRID}<path d="M19.5 12h3M21 10.5v3"/>`),
  deleteRow: svg(`${GRID}<path d="M5 15h14" stroke-width="3.2"/>`),
  deleteColumn: svg(`${GRID}<path d="M15.5 6v12" stroke-width="3.2"/>`),
  source: svg('<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>'),
  plus: svg('<path d="M5 12h14M12 5v14"/>'),
}

const label = (key: "addRow" | "addColumn" | "rowAbove" | "rowBelow" | "columnBefore" | "columnAfter" | "deleteRow" | "deleteColumn" | "source"): string =>
  i18n.t(`table.${key}` as "table.addRow")

const sameShape = (a: ParsedTable, b: ParsedTable) => a.header.length === b.header.length && a.rows.length === b.rows.length

function cellAt(wrap: HTMLElement, position: Position): HTMLElement | null {
  return wrap.querySelector<HTMLElement>(`[data-row="${position.row}"][data-column="${position.column}"]`)
}

/** Writes the table into the document, over what it was. */
function write(view: EditorView, wrap: Wrap): void {
  const state = wrap.__table
  if (!state || !wrap.isConnected) return
  window.clearTimeout(state.timer)
  let from: number
  try {
    from = view.posAtDOM(wrap) + state.prefix
  } catch {
    return
  }
  const text = serializeTable(state.table).join("\n")
  if (view.state.doc.sliceString(from, from + state.length) === text) return
  const length = state.length
  state.length = text.length
  view.dispatch({ changes: { from, to: Math.min(from + length, view.state.doc.length), insert: text }, userEvent: "input.table" })
}

function show(wrap: Wrap, hooks: TableWidgetHooks, cell: HTMLElement, editing: boolean): void {
  const state = wrap.__table!
  const row = Number(cell.dataset.row)
  const column = Number(cell.dataset.column)
  const text = row < 0 ? state.table.header[column] : state.table.rows[row]?.[column] ?? ""
  if (editing) cell.textContent = text
  else cell.innerHTML = hooks.render(text)
}

function build(view: EditorView, wrap: Wrap, hooks: TableWidgetHooks): void {
  const state = wrap.__table!
  wrap.replaceChildren()

  /** Changes the structure: written at once, and the cursor goes to `focus` once the widget has been rebuilt. */
  const restructure = (next: ParsedTable, focus: Position) => {
    state.table = next
    pendingFocus.set(view, focus)
    write(view, wrap)
  }
  const here = (): Position => state.focus ?? { row: 0, column: 0 }

  // --- the bar: rows and columns of the cell that has the cursor ---
  const bar = document.createElement("div")
  bar.className = "cm-lp-table-bar"
  const tool = (icon: string, title: string, run: () => void) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "cm-lp-table-tool"
    button.title = title
    button.setAttribute("aria-label", title)
    button.innerHTML = icon
    // The cell keeps its cursor while a tool is used
    button.addEventListener("mousedown", (event) => event.preventDefault())
    button.addEventListener("click", run)
    bar.append(button)
  }
  tool(ICONS.rowAbove, label("rowAbove"), () => {
    const at = here()
    restructure(insertRow(state.table, Math.max(at.row, 0)), { row: Math.max(at.row, 0), column: at.column })
  })
  tool(ICONS.rowBelow, label("rowBelow"), () => {
    const at = here()
    restructure(insertRow(state.table, at.row + 1), { row: at.row + 1, column: at.column })
  })
  tool(ICONS.columnBefore, label("columnBefore"), () => {
    const at = here()
    restructure(insertColumn(state.table, at.column), { row: at.row, column: at.column })
  })
  tool(ICONS.columnAfter, label("columnAfter"), () => {
    const at = here()
    restructure(insertColumn(state.table, at.column + 1), { row: at.row, column: at.column + 1 })
  })
  tool(ICONS.deleteRow, label("deleteRow"), () => {
    const at = here()
    if (at.row < 0) return
    restructure(deleteRow(state.table, at.row), { row: Math.min(at.row, state.table.rows.length - 2), column: at.column })
  })
  tool(ICONS.deleteColumn, label("deleteColumn"), () => {
    const at = here()
    restructure(deleteColumn(state.table, at.column), { row: at.row, column: Math.min(at.column, state.table.header.length - 2) })
  })
  tool(ICONS.source, label("source"), () => hooks.source(view, wrap))
  wrap.append(bar)

  // --- the table ---
  const table = document.createElement("table")
  const makeRow = (cells: string[], row: number) => {
    const tr = document.createElement("tr")
    cells.forEach((_, column) => {
      const cell = document.createElement(row < 0 ? "th" : "td")
      cell.dataset.row = String(row)
      cell.dataset.column = String(column)
      cell.setAttribute("contenteditable", "plaintext-only")
      cell.setAttribute("spellcheck", "false")
      cell.dir = "auto"
      const align = state.table.align[column]
      if (align) cell.style.textAlign = align
      show(wrap, hooks, cell, false)

      cell.addEventListener("focus", () => {
        state.focus = { row, column }
        show(wrap, hooks, cell, true)
        // The cell shows its Markdown now: the caret goes to its end
        const range = document.createRange()
        range.selectNodeContents(cell)
        range.collapse(false)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        wrap.classList.add("cm-lp-table-active")
      })
      cell.addEventListener("input", () => {
        state.table = setCell(state.table, row, column, cell.textContent ?? "")
        window.clearTimeout(state.timer)
        state.timer = window.setTimeout(() => write(view, wrap), 250)
      })
      cell.addEventListener("blur", (event) => {
        state.table = setCell(state.table, row, column, cell.textContent ?? "")
        write(view, wrap)
        show(wrap, hooks, cell, false)
        // Moving to another cell of this table (or its bar) keeps the bar open
        if (!wrap.contains((event as FocusEvent).relatedTarget as Node | null)) wrap.classList.remove("cm-lp-table-active")
      })
      cell.addEventListener("keydown", (event) => {
        const columns = state.table.header.length
        const move = (to: Position | null) => {
          event.preventDefault()
          if (to) cellAt(wrap, to)?.focus()
          else cell.blur()
        }
        if (event.key === "Escape") return move(null)
        if (event.key === "Enter") {
          if (event.shiftKey) return event.preventDefault()
          return move(row + 1 < state.table.rows.length ? { row: row + 1, column } : null)
        }
        if (event.key === "Tab") {
          const index = (row + 1) * columns + column + (event.shiftKey ? -1 : 1)
          const rows = state.table.rows.length + 1
          if (index < 0) return move(null)
          if (index >= rows * columns) {
            // Tab from the last cell opens a new row
            event.preventDefault()
            state.table = setCell(state.table, row, column, cell.textContent ?? "")
            return restructure(insertRow(state.table, state.table.rows.length), { row: state.table.rows.length, column: 0 })
          }
          return move({ row: Math.floor(index / columns) - 1, column: index % columns })
        }
      })
      tr.append(cell)
    })
    return tr
  }
  const head = document.createElement("thead")
  head.append(makeRow(state.table.header, -1))
  const body = document.createElement("tbody")
  state.table.rows.forEach((cells, index) => body.append(makeRow(cells, index)))
  table.append(head, body)

  // --- a plus after the last row and after the last column ---
  const strip = (className: string, title: string, run: () => void) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = className
    button.title = title
    button.setAttribute("aria-label", title)
    button.innerHTML = ICONS.plus
    button.addEventListener("mousedown", (event) => event.preventDefault())
    button.addEventListener("click", run)
    return button
  }
  const addRow = strip("cm-lp-table-add cm-lp-table-addrow", label("addRow"), () => restructure(insertRow(state.table, state.table.rows.length), { row: state.table.rows.length, column: 0 }))
  const addColumn = strip("cm-lp-table-add cm-lp-table-addcolumn", label("addColumn"), () => restructure(insertColumn(state.table, state.table.header.length), { row: -1, column: state.table.header.length }))

  const area = document.createElement("div")
  area.className = "cm-lp-table-area"
  const grid = document.createElement("div")
  grid.className = "cm-lp-table-grid"
  grid.append(table, addColumn)
  area.append(grid, addRow)
  wrap.append(area)

  wrap.append(hooks.gear(view, wrap))
  // The widget replaced an older one (a row was added): the cursor is where the user was
  const focus = pendingFocus.get(view)
  if (focus) {
    pendingFocus.delete(view)
    requestAnimationFrame(() => (cellAt(wrap, focus) ?? cellAt(wrap, { row: -1, column: 0 }))?.focus())
  }
}

export class EditableTableWidget extends WidgetType {
  readonly table: ParsedTable
  /** The text the widget stands for: the `{...}` line (if any), what lies between it and the table, and the table. */
  readonly source: string
  readonly prefix: number
  readonly hooks: TableWidgetHooks
  constructor(table: ParsedTable, source: string, prefix: number, hooks: TableWidgetHooks) {
    super()
    this.table = table
    this.source = source
    this.prefix = prefix
    this.hooks = hooks
  }
  eq(other: EditableTableWidget) {
    return other.source === this.source
  }
  toDOM(view: EditorView) {
    const wrap: Wrap = document.createElement("div")
    wrap.className = "cm-lp-table"
    wrap.__table = { table: normalizeTable(this.table), length: this.source.length - this.prefix, prefix: this.prefix, focus: null, timer: 0 }
    build(view, wrap, this.hooks)
    return wrap
  }
  /** The text changed (typing here, or an undo): the same cells are updated where they stand, so the cursor is not lost. */
  updateDOM(dom: HTMLElement, view: EditorView) {
    const wrap = dom as Wrap
    const state = wrap.__table
    if (!state) return false
    const next = normalizeTable(this.table)
    // The shape is compared with the cells on the page: a row or column added here changed `state.table` already
    const shown = { header: new Array<string>(wrap.querySelectorAll("thead th").length), rows: new Array<string[]>(wrap.querySelectorAll("tbody tr").length) } as ParsedTable
    if (!sameShape(shown, next)) return false
    state.table = next
    state.length = this.source.length - this.prefix
    state.prefix = this.prefix
    wrap.querySelectorAll<HTMLElement>("[data-row]").forEach((cell) => {
      if (cell !== document.activeElement) show(wrap, this.hooks, cell, false)
    })
    void view
    return true
  }
  destroy(dom: HTMLElement) {
    window.clearTimeout((dom as Wrap).__table?.timer)
  }
  ignoreEvent() {
    return true
  }
}

export const tableEditorTheme = EditorView.baseTheme({
  ".cm-lp-table": { position: "relative", margin: "6px 12px" },
  ".cm-lp-table-area": { overflowX: "auto" },
  ".cm-lp-table-grid": { display: "flex", alignItems: "stretch", width: "fit-content", minWidth: "100%" },
  ".cm-lp-table table": { borderCollapse: "collapse", flex: "1", fontSize: "0.95em" },
  ".cm-lp-table th, .cm-lp-table td": { border: "1px solid var(--border)", padding: "4px 8px", minWidth: "3em", height: "2em", outline: "none", verticalAlign: "top" },
  ".cm-lp-table th": { backgroundColor: "var(--muted)", fontWeight: "600" },
  ".cm-lp-table th:focus, .cm-lp-table td:focus": { boxShadow: "inset 0 0 0 2px var(--ring)", backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)", whiteSpace: "pre-wrap" },
  ".cm-lp-table-bar": {
    display: "none",
    position: "absolute",
    insetInlineStart: "0",
    top: "-30px",
    gap: "1px",
    padding: "2px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    backgroundColor: "var(--popover)",
    zIndex: "6",
  },
  ".cm-lp-table-active .cm-lp-table-bar, .cm-lp-table:hover .cm-lp-table-bar": { display: "flex" },
  ".cm-lp-table-tool": { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "26px", height: "24px", border: "none", borderRadius: "6px", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer" },
  ".cm-lp-table-tool:hover": { backgroundColor: "var(--accent)", color: "var(--foreground)" },
  ".cm-lp-table-add": { display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: "6px", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", opacity: "0.55" },
  ".cm-lp-table-add:hover": { opacity: "1", backgroundColor: "var(--accent)", color: "var(--foreground)" },
  ".cm-lp-table-addrow": { width: "100%", height: "20px", marginTop: "3px" },
  ".cm-lp-table-addcolumn": { width: "20px", marginInlineStart: "3px" },
  ".cm-lp-table-gear": { position: "absolute", top: "2px", insetInlineEnd: "2px", backgroundColor: "var(--card)", border: "1px solid var(--border)", opacity: "0" },
  ".cm-lp-table:hover .cm-lp-table-gear": { opacity: "1" },
})
