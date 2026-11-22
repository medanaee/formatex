import { useEffect, useMemo, useRef, useState } from "react"
import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { closeSearchPanel, findNext, findPrevious, replaceAll, replaceNext, SearchQuery, setSearchQuery } from "@codemirror/search"
import { CaseSensitive, ChevronDown, ChevronUp, History, Regex, Replace, ReplaceAll, WholeWord, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSettingsStore } from "@/stores/useSettingsStore"

const MAX_MATCHES = 9999

function countMatches(state: EditorState, query: SearchQuery): { current: number; total: number; capped: boolean } | null {
  if (!query.search || !query.valid) return null
  const { from: selFrom, to: selTo } = state.selection.main
  let total = 0
  let current = 0
  let capped = false
  const iter = query.getCursor(state)
  for (let step = iter.next(); !step.done; step = iter.next()) {
    total++
    if (current === 0 && step.value.from === selFrom && step.value.to === selTo) current = total
    if (total >= MAX_MATCHES) {
      capped = true
      break
    }
  }
  return { current, total, capped }
}

/** The same search commands as Ctrl+F, with translated, touch-sized app controls. */
export function EditorSearchPanel({ view, query }: { view: EditorView; query: SearchQuery }) {
  const { t, i18n } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [replacing, setReplacing] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [filtering, setFiltering] = useState(false)
  const searchHistory = useSettingsStore((state) => state.searchHistory)
  const addSearchHistory = useSettingsStore((state) => state.addSearchHistory)
  const removeSearchHistory = useSettingsStore((state) => state.removeSearchHistory)

  useEffect(() => { input.current?.focus(); input.current?.select() }, [])

  useEffect(() => {
    if (!historyOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setHistoryOpen(false)
    }
    window.addEventListener("mousedown", onPointerDown)
    return () => window.removeEventListener("mousedown", onPointerDown)
  }, [historyOpen])

  const suggestions = useMemo(() => {
    if (!filtering || !query.search.trim()) return searchHistory
    const needle = query.search.toLowerCase()
    const matched = searchHistory.filter((item) => item.toLowerCase().includes(needle))
    return matched.length > 0 ? matched : searchHistory
  }, [filtering, query.search, searchHistory])

  const matches = useMemo(() => countMatches(view.state, query), [view.state, query])

  const change = (patch: Partial<{ search: string; replace: string; caseSensitive: boolean; regexp: boolean; wholeWord: boolean }>) => {
    view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: query.search, replace: query.replace, caseSensitive: query.caseSensitive, regexp: query.regexp, wholeWord: query.wholeWord, literal: query.literal, ...patch })) })
  }
  const commit = (term = query.search) => {
    if (term.trim()) addSearchHistory(term)
  }
  const action = (run: (view: EditorView) => boolean, record = false) => () => {
    if (record) commit()
    run(view)
  }
  const pickSuggestion = (term: string) => {
    setHistoryOpen(false)
    setFiltering(false)
    change({ search: term })
    addSearchHistory(term)
    queueMicrotask(() => {
      findNext(view)
      input.current?.focus()
    })
  }

  return (
    <div role="search" aria-label={t("appMenu.find")} dir={i18n.dir()} className="grid gap-1 border-b border-border bg-background p-1 text-xs text-foreground" onMouseDown={(event) => { if ((event.target as HTMLElement).closest("button")) event.preventDefault() }} onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation()
        if (historyOpen) setHistoryOpen(false)
        else closeSearchPanel(view)
      } else if (event.key === "Enter") {
        event.preventDefault(); event.stopPropagation()
        setHistoryOpen(false)
        commit()
        ;(event.shiftKey ? findPrevious : findNext)(view)
      }
    }}>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-lg" title={t("editorSearch.toggleReplace")} aria-label={t("editorSearch.toggleReplace")} aria-pressed={replacing} onClick={() => setReplacing(!replacing)}><Replace /></Button>
        <div ref={box} className="relative min-w-16 flex-1">
          <Input
            ref={input}
            main-field=""
            type="search"
            dir="auto"
            aria-label={t("appMenu.find")}
            placeholder={t("appMenu.find")}
            aria-invalid={!query.valid && !!query.search}
            value={query.search}
            onClick={() => { if (searchHistory.length > 0) { setFiltering(false); setHistoryOpen(true) } }}
            onChange={(event) => {
              change({ search: event.target.value })
              setFiltering(true)
              if (searchHistory.length > 0) setHistoryOpen(true)
            }}
            className="h-9 w-full text-xs"
          />
          {historyOpen && suggestions.length > 0 && (
            <ul role="listbox" aria-label={t("appMenu.find")} className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover/85 p-1 text-popover-foreground shadow-lg backdrop-blur-xl">
              {suggestions.map((item) => (
                <li key={item} role="option" aria-selected={item === query.search} className="group flex items-center gap-1 rounded-md hover:bg-accent hover:text-accent-foreground">
                  <button
                    type="button"
                    onClick={() => pickSuggestion(item)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-start text-xs outline-none"
                  >
                    <History className="size-3.5 shrink-0 text-muted-foreground" />
                    <span dir="auto" className="min-w-0 flex-1 truncate">{item}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={t("common.close")}
                    onClick={(event) => {
                      event.stopPropagation()
                      removeSearchHistory(item)
                    }}
                    className="me-1 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {matches && (
          <span
            dir="ltr"
            data-testid="search-match-count"
            className={`shrink-0 px-1.5 text-[11px] tabular-nums select-none ${matches.total === 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {matches.current} / {matches.total}{matches.capped ? "+" : ""}
          </span>
        )}
        <Button variant="ghost" size="icon-lg" disabled={!query.valid} aria-label={t("editorSearch.previous")} title={t("editorSearch.previous")} onClick={action(findPrevious, true)}><ChevronUp /></Button>
        <Button variant="ghost" size="icon-lg" disabled={!query.valid} aria-label={t("editorSearch.next")} title={t("editorSearch.next")} onClick={action(findNext, true)}><ChevronDown /></Button>
        <Button variant="ghost" size="icon-lg" aria-label={t("common.close")} title={t("common.close")} onClick={action(closeSearchPanel)}><X /></Button>
      </div>
      {replacing && <div className="flex items-center gap-1">
        <Input dir="auto" aria-label={t("editorSearch.replace")} placeholder={t("editorSearch.replace")} value={query.replace} onChange={(event) => change({ replace: event.target.value })} className="h-9 min-w-16 flex-1 text-xs" />
        <Button variant="ghost" size="icon-lg" disabled={!query.valid} aria-label={t("editorSearch.replaceNext")} title={t("editorSearch.replaceNext")} onClick={action(replaceNext, true)}><Replace /></Button>
        <Button variant="ghost" size="icon-lg" disabled={!query.valid} aria-label={t("editorSearch.replaceAll")} title={t("editorSearch.replaceAll")} onClick={action(replaceAll, true)}><ReplaceAll /></Button>
      </div>}
      <div className="flex gap-1">
        <Button variant="ghost" size="icon-lg" title={t("editorSearch.caseSensitive")} aria-label={t("editorSearch.caseSensitive")} aria-pressed={query.caseSensitive} className={query.caseSensitive ? "bg-accent" : ""} onClick={() => change({ caseSensitive: !query.caseSensitive })}><CaseSensitive /></Button>
        <Button variant="ghost" size="icon-lg" title={t("editorSearch.regexp")} aria-label={t("editorSearch.regexp")} aria-pressed={query.regexp} className={query.regexp ? "bg-accent" : ""} onClick={() => change({ regexp: !query.regexp })}><Regex /></Button>
        <Button variant="ghost" size="icon-lg" title={t("editorSearch.wholeWord")} aria-label={t("editorSearch.wholeWord")} aria-pressed={query.wholeWord} className={query.wholeWord ? "bg-accent" : ""} onClick={() => change({ wholeWord: !query.wholeWord })}><WholeWord /></Button>
      </div>
    </div>
  )
}
