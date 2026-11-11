import type { Text } from "@codemirror/state"

const item = /^\s{0,3}([-*+]|[0-9]{1,9}[.)])(\s|$)/
const restart = /^\s{0,3}(1[.)]|0[.)]|[۱١][.)])(\s|$)/

/**
 * The first lines of the lists inside one Markdown list. Markdown keeps a list going through blank lines, but the engine ends a list at two
 * blank lines or more followed by an item of the list's own depth, or at an item that restarts numbering (e.g. 1. / 0.) after one blank line
 * (the next one is a list of its own, with its own settings), so the editor shows one gear for each.
 */
export function listStarts(doc: Text, fromLine: number, toLine: number): number[] {
  const starts = [fromLine]
  const margin = (text: string) => text.length - text.trimStart().length
  const own = margin(doc.line(fromLine).text)
  let blanks = 0
  for (let n = fromLine + 1; n <= toLine; n++) {
    const text = doc.line(n).text
    if (text.trim() === "") {
      blanks++
      continue
    }
    const isItem = item.test(text)
    const isRestart = restart.test(text)
    if (((blanks >= 2 && isItem) || (blanks >= 1 && isRestart)) && margin(text) <= own) {
      starts.push(n)
    }
    blanks = 0
  }
  return starts
}
