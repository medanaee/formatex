import { useState } from "react"
import type { Copy, Lang } from "@/content"
import { Code } from "@/sections/Wall"

const IDS = ["toc", "lists", "body"] as const

const pictures = import.meta.glob("../assets/refs/*/*.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>
const sources = import.meta.glob("../assets/refs/*/*.md", { eager: true, query: "?raw", import: "default" }) as Record<string, string>

/** Contents, lists of figures, and a page of references: three real pages, with the tags that made them on hover (a tap on a phone). */
export function Refs({ t, lang }: { t: Copy["refs"]; lang: Lang }) {
  const [open, setOpen] = useState<string | null>(null)
  const card = (i: number) => {
    const id = IDS[i]
    return (
      <figure key={id} className="ref">
        <div
          className="ref-page"
          data-open={open === id}
          role="button"
          tabIndex={0}
          aria-pressed={open === id}
          onClick={() => setOpen(open === id ? null : id)}
          onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && (event.preventDefault(), setOpen(open === id ? null : id))}
        >
          <img src={pictures[`../assets/refs/${lang}/${id}.svg`]} alt={t.pages[i].name} loading="lazy" draggable={false} />
          <div className="slide-code mono" dir="ltr" aria-hidden="true">
            <Code source={sources[`../assets/refs/${lang}/${id}.md`] ?? ""} />
          </div>
        </div>
        <figcaption>
          <span className="mono">{t.pages[i].tag}</span>
          {t.pages[i].name}
        </figcaption>
      </figure>
    )
  }
  return (
    <section id="refs" className="mx-auto max-w-[1320px] px-[clamp(30px,4vw,48px)] py-28">
      <span className="eyebrow">{t.eyebrow}</span>
      <h2 className="h2 max-w-3xl">{t.title}</h2>
      <p className="lead">{t.text}</p>

      <div className="refs">
        <div className="ref-stack">{[0, 1].map((i) => card(i))}</div>
        {card(2)}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">{t.hint}</p>
    </section>
  )
}
