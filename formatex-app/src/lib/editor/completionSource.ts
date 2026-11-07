import { snippet, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete"
import { complete, completeValue, type CompletionEnv, type Completions, type Suggestion, type SuggestionKind } from "./completion"
import { completeToml } from "./configCompletion"

const TYPE: Record<SuggestionKind, string> = {
  tag: "class",
  attribute: "property",
  value: "enum",
  close: "keyword",
  option: "property",
  variable: "variable",
  keyword: "keyword",
}

/**
 * CodeMirror's completion source over `complete()`. `getEnv` is read on every request, so the language of the descriptions and
 * the project's file list are always current without rebuilding the editor.
 */
export function completionSource(getEnv: () => CompletionEnv, kind: "markdown" | "toml" = "markdown") {
  const run: (text: string, pos: number, env: CompletionEnv) => Completions | null = kind === "toml" ? completeToml : complete
  const toOptions = (suggestions: Suggestion[]): Completion[] =>
    suggestions.map((suggestion) => ({
      label: suggestion.label,
      type: TYPE[suggestion.kind],
      detail: suggestion.detail,
      info: suggestion.info || undefined,
      boost: suggestion.boost,
      apply: suggestion.template.includes("${") ? snippet(suggestion.template) : suggestion.template,
    }))
  return (context: CompletionContext): CompletionResult | null => {
    const text = context.state.doc.toString()
    const env = getEnv()
    // In the value of an attribute that is already written, a choice replaces the whole value. Opened without typing (the cursor moved
    // there), all the values are offered, whatever stands before the cursor; while typing they are filtered by it
    const value = kind === "markdown" ? completeValue(text, context.pos, env) : null
    if (value) return { from: value.from, to: value.to, options: toOptions(value.options), filter: !context.explicit }
    const result = run(text, context.pos, env)
    if (!result) return null
    return { from: result.from, options: toOptions(result.options), validFor: /^[\w\-#./"]*$/ }
  }
}
