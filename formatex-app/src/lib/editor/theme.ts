import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { EditorView } from "@codemirror/view"
import { tags as t } from "@lezer/highlight"

/**
 * The editor's look. Every color is a CSS variable of the app (`index.css`), so light / dark follow the theme with no
 * reconfiguration. Compact: small monospace text, thin gutter, no borders.
 */
export const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    // Its panels have z-index 300: kept inside the editor, so menus and popovers (80) open over them
    isolation: "isolate",
    color: "var(--foreground)",
    backgroundColor: "var(--background)",
    fontSize: "13px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "ui-monospace, 'Cascadia Mono', Menlo, Consolas, 'Vazir Code', monospace", lineHeight: "1.65", overflow: "auto" },
  ".cm-content": { caretColor: "var(--foreground)", padding: "8px 0" },
  ".cm-line": { padding: "0 12px" },
  ".cm-cursor": { borderLeftColor: "var(--foreground)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--muted) 55%, transparent)" },
  ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklab, var(--primary) 22%, transparent)",
  },
  ".cm-gutters": { backgroundColor: "var(--background)", color: "var(--muted-foreground)", border: "none", opacity: "0.7" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--foreground)" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 6px 0 10px", minWidth: "28px", fontSize: "11px" },
  ".cm-placeholder": { color: "var(--muted-foreground)" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in oklab, var(--primary) 18%, transparent)" },

  ".cm-tooltip": {
    border: "1px solid var(--border)",
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "none",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": { fontFamily: "inherit", maxHeight: "16em" },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": { padding: "4px 8px", lineHeight: "1.4", display: "flex", alignItems: "baseline", gap: "6px" },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" },
  ".cm-completionLabel": { fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: "12.5px" },
  ".cm-completionDetail": { marginInlineStart: "auto", fontStyle: "normal", color: "var(--muted-foreground)", fontSize: "11px" },
  ".cm-completionInfo": {
    padding: "6px 8px",
    maxWidth: "260px",
    fontFamily: "Inter, Vazirmatn, system-ui, sans-serif",
    fontSize: "12px",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
  },
  ".cm-completionIcon": { display: "none" },

  // Search panel (Ctrl+F): the app's compact inputs and buttons instead of the browser's
  ".cm-panels": { backgroundColor: "var(--popover)", color: "var(--popover-foreground)", borderTop: "1px solid var(--border)", fontFamily: "Inter, Vazirmatn, system-ui, sans-serif" },
  ".cm-panels-top": { borderBottom: "1px solid var(--border)", borderTop: "none" },
  ".cm-panel.cm-search": { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px", padding: "6px 30px 6px 8px", fontSize: "12px", position: "relative" },
  ".cm-panel.cm-search br": { display: "none" },
  ".cm-panel.cm-search input.cm-textfield": {
    height: "28px",
    width: "11rem",
    margin: "0",
    padding: "0 8px",
    border: "1px solid var(--input)",
    borderRadius: "8px",
    backgroundColor: "transparent",
    color: "var(--foreground)",
    fontSize: "12px",
    outline: "none",
  },
  ".cm-panel.cm-search input.cm-textfield:focus": { borderColor: "var(--ring)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 40%, transparent)" },
  ".cm-panel.cm-search button.cm-button": {
    height: "28px",
    margin: "0",
    padding: "0 10px",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    backgroundImage: "none",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    fontSize: "12px",
    cursor: "pointer",
  },
  ".cm-panel.cm-search button.cm-button:hover": { backgroundColor: "var(--muted)" },
  ".cm-panel.cm-search label": { display: "inline-flex", alignItems: "center", gap: "4px", margin: "0 4px", color: "var(--muted-foreground)", fontSize: "11px", cursor: "pointer" },
  ".cm-panel.cm-search input[type=checkbox]": {
    appearance: "none",
    width: "14px",
    height: "14px",
    margin: "0",
    border: "1px solid var(--input)",
    borderRadius: "4px",
    backgroundColor: "transparent",
    cursor: "pointer",
  },
  ".cm-panel.cm-search input[type=checkbox]:checked": {
    backgroundColor: "var(--primary)",
    borderColor: "var(--primary)",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.5 8.5l3 3 6-7'/%3E%3C/svg%3E\")",
    backgroundSize: "100%",
  },
  ".cm-panel.cm-search button[name=close]": {
    position: "absolute",
    top: "6px",
    right: "6px",
    width: "28px",
    padding: "0",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--muted-foreground)",
    fontSize: "16px",
  },
  ".cm-panel.cm-search button[name=close]:hover": { backgroundColor: "var(--muted)", color: "var(--foreground)" },
  ".cm-searchMatch": { backgroundColor: "color-mix(in oklab, var(--primary) 25%, transparent)" },
})

const highlightStyle = HighlightStyle.define([
  { tag: t.heading, color: "var(--syntax-heading)", fontWeight: "600" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: [t.link, t.url], color: "var(--syntax-link)" },
  { tag: t.monospace, color: "var(--syntax-string)" },
  { tag: t.quote, color: "var(--syntax-comment)" },
  { tag: [t.processingInstruction, t.contentSeparator, t.meta], color: "var(--syntax-mark)" },
  // HTML-like tags of the engine, inside Markdown
  { tag: [t.tagName, t.angleBracket], color: "var(--syntax-tag)" },
  { tag: t.attributeName, color: "var(--syntax-attr)" },
  { tag: [t.attributeValue, t.string], color: "var(--syntax-string)" },
  // TOML and other plain config
  { tag: [t.propertyName, t.definition(t.propertyName)], color: "var(--syntax-attr)" },
  { tag: [t.number, t.bool, t.atom], color: "var(--syntax-number)" },
  { tag: t.keyword, color: "var(--syntax-heading)" },
  { tag: t.comment, color: "var(--syntax-comment)", fontStyle: "italic" },
])

export const editorHighlighting = syntaxHighlighting(highlightStyle)
