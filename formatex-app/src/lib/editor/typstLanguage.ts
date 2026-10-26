import { StreamLanguage } from "@codemirror/language"

const KEYWORDS = new Set(["let", "set", "show", "if", "else", "for", "while", "in", "not", "and", "or", "return", "import", "include", "break", "continue", "context", "as"])
const ATOMS = new Set(["true", "false", "none", "auto"])

interface State {
  /** Inside a `/* ... *\/` comment. */
  comment: boolean
}

/**
 * A light Typst highlighter for the component editor: comments, strings, numbers, keywords and `#` calls. It does not parse
 * Typst; it colors what is easy to recognize, which is what reading a few dozen lines needs.
 */
export const typstLanguage = StreamLanguage.define<State>({
  name: "typst",
  startState: () => ({ comment: false }),
  token(stream, state) {
    if (state.comment) {
      while (!stream.eol()) if (stream.match("*/")) { state.comment = false; break } else stream.next()
      return "comment"
    }
    if (stream.eatSpace()) return null
    if (stream.match("//")) {
      stream.skipToEnd()
      return "comment"
    }
    if (stream.match("/*")) {
      state.comment = true
      return "comment"
    }
    if (stream.match('"')) {
      while (!stream.eol()) {
        const char = stream.next()
        if (char === "\\") stream.next()
        else if (char === '"') break
      }
      return "string"
    }
    if (stream.match(/^\d+(\.\d+)?(pt|em|mm|cm|in|%|fr|deg)?/)) return "number"
    if (stream.match(/^#?[A-Za-z_][\w-]*/)) {
      const word = stream.current().replace(/^#/, "")
      if (KEYWORDS.has(word)) return "keyword"
      if (ATOMS.has(word)) return "atom"
      if (stream.current().startsWith("#")) return "keyword"
      return stream.peek() === ":" ? "propertyName" : null
    }
    stream.next()
    return null
  },
})
