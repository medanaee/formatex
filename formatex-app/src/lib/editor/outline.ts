import { frontMatterEnd } from "./configCompletion"

export interface OutlineHeading {
  /** 1-based line number. */
  line: number
  /** Offset of the start of the line. */
  from: number
  level: number
  /** The heading's words, without the `#`s and the `{...}` options. */
  title: string
}

/** The headings of a Markdown text, in order; the front matter and fenced code are skipped. */
export function parseHeadings(text: string): OutlineHeading[] {
  const headings: OutlineHeading[] = []
  // `frontMatterEnd` is the start of the closing `---` line; the block takes that line too
  const frontEnd = frontMatterEnd(text)
  let fence: string | null = null
  let from = 0
  let line = 0
  for (const raw of text.split("\n")) {
    line++
    const lineFrom = from
    from += raw.length + 1
    if (frontEnd !== null && lineFrom <= frontEnd) continue
    const marker = /^[ \t]*(`{3,}|~{3,})/.exec(raw)?.[1]
    if (marker) {
      if (fence === null) fence = marker[0]
      else if (marker[0] === fence) fence = null
      continue
    }
    if (fence !== null) continue
    const match = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*$/.exec(raw)
    if (!match) continue
    const title = match[2]
      .replace(/[ \t]+#+$/, "")
      .replace(/\s*\{[^{}]*\}\s*$/, "")
      .replace(/[*_`]/g, "")
      .trim()
    headings.push({ line, from: lineFrom, level: match[1].length, title })
  }
  return headings
}

/** The headings that enclose a line (outermost first, at most `max`): what an editor keeps pinned at the top while that line is shown. */
export function enclosingHeadings(headings: readonly OutlineHeading[], line: number, max = 3): OutlineHeading[] {
  const stack: OutlineHeading[] = []
  for (const heading of headings) {
    if (heading.line >= line) break
    while (stack.length && stack[stack.length - 1].level >= heading.level) stack.pop()
    stack.push(heading)
  }
  return stack.slice(0, max)
}
