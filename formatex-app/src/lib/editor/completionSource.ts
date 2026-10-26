import { snippet, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete"
import { complete, type CompletionEnv, type Completions, type SuggestionKind } from "./completion"
import { completeToml } from "./configCompletion"

const TYPE: Record<SuggestionKind, string> = {
  tag: "class",
  attribute: "property",
  value: "enum",
  close: "keyword",
  option: "property",
}

/**
 * CodeMirror's completion source over `complete()`. `getEnv` is read on every request, so the language of the descriptions and
 * the project's file list are always current without rebuilding the editor.
 */
export function completionSource(getEnv: () => CompletionEnv, kind: "markdown" | "toml" = "markdown") {
  const run: (text: string, pos: number, env: CompletionEnv) => Completions | null = kind === "toml" ? completeToml : complete
  return (context: CompletionContext): CompletionResult | null => {
    const result = run(context.state.doc.toString(), context.pos, getEnv())
    if (!result) return null
    const options: Completion[] = result.options.map((suggestion) => ({
      label: suggestion.label,
      type: TYPE[suggestion.kind],
      detail: suggestion.detail,
      info: suggestion.info || undefined,
      boost: suggestion.boost,
      apply: suggestion.template.includes("${") ? snippet(suggestion.template) : suggestion.template,
    }))
    return { from: result.from, options, validFor: /^[\w\-#./"]*$/ }
  }
}
