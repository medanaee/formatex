import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Copy, Lang } from "@/content"

/** Every tag of the engine (`formatex-typ/dist/tags.json`): the bars show them going by. */
const TAGS = "alert align badge box cetz chart chat user ai cite bibliography code compare pros cons def diff before old after new del ins dir div docheader main title l-img r-img info exercise choices answer answers fig caption lof lot lol fn footnote grid item icon img listpages include kbd letter lilaq a span anchor picheader progress ref v pagebreak steps step theorem lemma definition corollary example remark proof toc todo todos tree".split(" ")

/** The slides: a tag, rendered by the engine itself (scripts/render-tags.py) in the midnight theme, and the Markdown it came from. */
const SLIDES = ["alert", "chart", "letter", "steps", "compare", "lilaq", "tree", "progress", "exercise", "cetz", "badge", "chat", "code", "diff", "div", "theorem", "icon", "grid", "box", "todo"] as const

const pictures = import.meta.glob("../assets/tags/*/*.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>
const sources = import.meta.glob("../assets/tags/*/*.md", { eager: true, query: "?raw", import: "default" }) as Record<string, string>

/** A line of the source colored like the editor: tags, attributes, strings, table rows. */
export function Code({ source }: { source: string }) {
  return (
    <>
      {source
        .trimEnd()
        .split("\n")
        .map((line, n) => (
          <div key={n} className="wl">
            <span className="wn">{n + 1}</span>
            <span className="wt" dir="auto">
              {line.startsWith("|") ? (
                <span className="tb">{line}</span>
              ) : (
                line.split(/(<\/?[\w-]+|\/?>|"[^"]*"|[\w-]+(?==))/g).map((part, i) =>
                  /^<\/?[\w-]+$|^\/?>$/.test(part) ? (
                    <span key={i} className="k">
                      {part}
                    </span>
                  ) : /^"/.test(part) ? (
                    <span key={i} className="s">
                      {part}
                    </span>
                  ) : /^[\w-]+$/.test(part) && line.includes(part + "=") ? (
                    <span key={i} className="a">
                      {part}
                    </span>
                  ) : (
                    part
                  ),
                )
              )}
            </span>
          </div>
        ))}
    </>
  )
}

export function Wall({ t, lang }: { t: Copy["wall"]; lang: Lang }) {
  const row = (offset: number) => TAGS.slice(offset).concat(TAGS.slice(0, offset))
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  // On a touch screen there is no hover: a tap on the picture shows its code, and another tap hides it
  const [open, setOpen] = useState<string | null>(null)

  // The slide nearest to the start of the track, as it is scrolled by the thumb, the arrows or the keyboard
  const sync = useCallback(() => {
    const node = track.current
    if (!node) return
    const first = node.children[0] as HTMLElement | undefined
    if (!first) return
    const step = first.offsetWidth + parseFloat(getComputedStyle(node).columnGap || "0")
    setIndex(Math.round(Math.abs(node.scrollLeft) / step))
  }, [])
  useEffect(() => {
    sync()
    addEventListener("resize", sync)
    return () => removeEventListener("resize", sync)
  }, [sync])

  const go = (to: number) => {
    const node = track.current
    const slide = node?.children[Math.max(0, Math.min(SLIDES.length - 1, to))] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
  }

  return (
    <section id="components" className="py-28">
      <div className="mx-auto max-w-[1320px] px-[clamp(30px,4vw,48px)]">
        <span className="eyebrow">{t.eyebrow}</span>
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
          <span className="wall-count" dir="ltr">
            {t.count}
          </span>
          <h2 className="h2 !mt-0 pb-2">{t.title}</h2>
        </div>
        <p className="lead">{t.text}</p>
      </div>

      <div className="ticker" dir="ltr" aria-hidden="true">
        {[0, 31].map((offset, r) => (
          <div key={offset} className="lane" data-rev={r === 1}>
            <div className="track">
              {[...row(offset), ...row(offset)].map((name, i) => (
                <span key={i} className="mono">
                  &lt;{name}&gt;
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-14 max-w-[1320px] px-[clamp(30px,4vw,48px)]">
        <div className="slides" ref={track} onScroll={sync} tabIndex={0} aria-label={t.eyebrow}>
          {SLIDES.map((id) => (
            <article key={id} className="slide">
              <div
                className="slide-preview"
                data-open={open === id}
                role="button"
                tabIndex={0}
                aria-pressed={open === id}
                onClick={() => setOpen(open === id ? null : id)}
                onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && (event.preventDefault(), setOpen(open === id ? null : id))}
              >
                <img src={pictures[`../assets/tags/${lang}/${id}.svg`]} alt={id} loading="lazy" draggable={false} />
                <div className="slide-code mono" dir="ltr" aria-hidden="true">
                  <Code source={sources[`../assets/tags/${lang}/${id}.md`] ?? ""} />
                </div>
              </div>
              <div className="slide-tag mono">&lt;{id}&gt;</div>
            </article>
          ))}
        </div>

        <div className="slides-bar">
          <span className="slides-hint">{t.hint}</span>
          <span className="flex-1" />
          <span className="slides-count" dir="ltr">
            {Math.min(index + 1, SLIDES.length)} / {SLIDES.length}
          </span>
          <button type="button" className="arrow" onClick={() => go(index - 1)} disabled={index <= 0} aria-label={t.prev}>
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </button>
          <button type="button" className="arrow" onClick={() => go(index + 1)} disabled={index >= SLIDES.length - 1} aria-label={t.next}>
            <ChevronRight className="size-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </section>
  )
}
