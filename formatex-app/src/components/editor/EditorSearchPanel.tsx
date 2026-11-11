import { useEffect, useRef, useState } from "react"
import type { EditorView } from "@codemirror/view"
import { closeSearchPanel, findNext, findPrevious, replaceAll, replaceNext, SearchQuery, setSearchQuery } from "@codemirror/search"
import { CaseSensitive, ChevronDown, ChevronUp, Regex, Replace, ReplaceAll, WholeWord, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/** The same search commands as Ctrl+F, with translated, touch-sized app controls. */
export function EditorSearchPanel({ view, query }: { view: EditorView; query: SearchQuery }) {
  const { t, i18n } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [replacing, setReplacing] = useState(false)
  useEffect(() => { input.current?.focus(); input.current?.select() }, [])
  const change = (patch: Partial<{ search: string; replace: string; caseSensitive: boolean; regexp: boolean; wholeWord: boolean }>) => {
    view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: query.search, replace: query.replace, caseSensitive: query.caseSensitive, regexp: query.regexp, wholeWord: query.wholeWord, literal: query.literal, ...patch })) })
  }
  const action = (run: (view: EditorView) => boolean) => () => { run(view) }
  return (
    <div role="search" aria-label={t("appMenu.find")} dir={i18n.dir()} className="grid gap-1 border-b border-border bg-background p-1 text-xs text-foreground" onMouseDown={(event) => { if ((event.target as HTMLElement).closest("button")) event.preventDefault() }} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeSearchPanel(view) }
      else if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); (event.shiftKey ? findPrevious : findNext)(view) }
    }}>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-lg" title={t("editorSearch.toggleReplace")} aria-label={t("editorSearch.toggleReplace")} aria-pressed={replacing} onClick={() => setReplacing(!replacing)}><Replace /></Button>
        <Input ref={input} main-field="" type="search" dir="auto" aria-label={t("appMenu.find")} placeholder={t("appMenu.find")} aria-invalid={!query.valid && !!query.search} value={query.search} onChange={(event) => change({ search: event.target.value })} className="h-9 min-w-16 flex-1 text-xs" />
        <Button variant="ghost" size="icon-lg" disabled={!query.valid} aria-label={t("editorSearch.previous")} title={t("editorSearch.previous")} onClick={action(findPrevious)}><ChevronUp /></Button>
        <Button variant="ghost" size="icon-lg" disabled={!query.valid} aria-label={t("editorSearch.next")} title={t("editorSearch.next")} onClick={action(findNext)}><ChevronDown /></Button>
        <Button variant="ghost" size="icon-lg" aria-label={t("common.close")} title={t("common.close")} onClick={action(closeSearchPanel)}><X /></Button>
      </div>
      {replacing && <div className="flex items-center gap-1">
        <Input dir="auto" aria-label={t("editorSearch.replace")} placeholder={t("editorSearch.replace")} value={query.replace} onChange={(event) => change({ replace: event.target.value })} className="h-9 min-w-16 flex-1 text-xs" />
        <Button variant="ghost" size="icon-lg" disabled={!query.valid} aria-label={t("editorSearch.replaceNext")} title={t("editorSearch.replaceNext")} onClick={action(replaceNext)}><Replace /></Button>
        <Button variant="ghost" size="icon-lg" disabled={!query.valid} aria-label={t("editorSearch.replaceAll")} title={t("editorSearch.replaceAll")} onClick={action(replaceAll)}><ReplaceAll /></Button>
      </div>}
      <div className="flex gap-1">
        <Button variant="ghost" size="icon-lg" title={t("editorSearch.caseSensitive")} aria-label={t("editorSearch.caseSensitive")} aria-pressed={query.caseSensitive} className={query.caseSensitive ? "bg-accent" : ""} onClick={() => change({ caseSensitive: !query.caseSensitive })}><CaseSensitive /></Button>
        <Button variant="ghost" size="icon-lg" title={t("editorSearch.regexp")} aria-label={t("editorSearch.regexp")} aria-pressed={query.regexp} className={query.regexp ? "bg-accent" : ""} onClick={() => change({ regexp: !query.regexp })}><Regex /></Button>
        <Button variant="ghost" size="icon-lg" title={t("editorSearch.wholeWord")} aria-label={t("editorSearch.wholeWord")} aria-pressed={query.wholeWord} className={query.wholeWord ? "bg-accent" : ""} onClick={() => change({ wholeWord: !query.wholeWord })}><WholeWord /></Button>
      </div>
    </div>
  )
}
