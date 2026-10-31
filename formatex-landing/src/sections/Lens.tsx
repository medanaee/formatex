import { useEffect, useRef } from "react"
import { ArrowDownToLine } from "lucide-react"
import { GitHubMark } from "@/components/marks"
import { RELEASES, REPO, type Copy } from "@/content"

/** A word between Markdown marks. Each part is its own isolate, so in a right-to-left line the marks stay on either side of the word. */
function Marked({ mark, children }: { mark: string; children: string }) {
  return (
    <>
      <bdi dir="ltr" className="dim">
        {mark}
      </bdi>
      <bdi>{children}</bdi>
      <bdi dir="ltr" className="dim">
        {mark}
      </bdi>
    </>
  )
}

/** The hero: the typeset headline, and a lens that follows the pointer and shows the Markdown it was set from. */
export function Lens({ t, dir }: { t: Copy["lens"]; dir: "ltr" | "rtl" }) {
  const hero = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = hero.current
    if (!node) return
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    let manual = false
    let tx = 0
    let ty = 0
    let cx = -1
    let cy = 0
    let frame = 0
    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      manual = true
      tx = event.clientX - rect.left
      ty = event.clientY - rect.top
    }
    const onLeave = () => {
      manual = false
    }
    const loop = (time: number) => {
      const rect = node.getBoundingClientRect()
      if (!manual) {
        tx = rect.width * (0.5 + 0.3 * Math.sin(time / 1700))
        ty = rect.height * (0.46 + 0.14 * Math.sin(time / 1100 + 1))
      }
      if (cx < 0) {
        cx = tx
        cy = ty
      }
      cx += (tx - cx) * 0.16
      cy += (ty - cy) * 0.16
      node.style.setProperty("--mx", `${cx}px`)
      node.style.setProperty("--my", `${cy}px`)
      if (!reduced || manual) frame = requestAnimationFrame(loop)
    }
    node.addEventListener("pointermove", onMove)
    node.addEventListener("pointerleave", onLeave)
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      node.removeEventListener("pointermove", onMove)
      node.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  const [subA, subB, subC] = t.sub
  const [leadA, leadB, leadC] = t.lead
  return (
    <section ref={hero} className="lens" id="top">
      <div className="lens-glow" />
      <div className="lens-stack">
        <div className="mb-3 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase rtl:tracking-normal">{t.kicker}</div>
        <div className="t1">{t.title}</div>
        <div className="t2">
          <span>
            {subA}
            <b>{subB}</b>
            {subC}
          </span>
        </div>
        <div className="t3">
          <span>
            {leadA}
            <em>{leadB}</em>
            {leadC}
            <span className="chip">{t.alert}</span>
          </span>
        </div>
        <div className="t4">
          <div className="bars-hero" aria-hidden="true">
            {[34, 58, 44, 78, 100].map((height) => (
              <i key={height} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="t5">
          <div className="meter" aria-hidden="true">
            <i />
          </div>
          <span dir="ltr">72%</span>
        </div>
      </div>

      {/* The same rows, set as source: only the lens shows them. The row boxes are the same, so the lines sit on each other.
          Every marked piece is a <bdi>, so its markers keep their place around the word in a right-to-left line. */}
      <div className="lens-stack lens-src" aria-hidden="true" dir={dir}>
        <div className="mb-3 text-xs">&nbsp;</div>
        <div className="t1">
          <span>
            <bdi dir="ltr" className="dim">
              #&nbsp;
            </bdi>
            {t.title}
          </span>
        </div>
        <div className="t2">
          <span>
            <bdi dir="ltr" className="dim">
              ##&nbsp;
            </bdi>
            {subA}
            <Marked mark="**">{subB}</Marked>
            {subC}
          </span>
        </div>
        <div className="t3">
          <span>
            {leadA}
            <Marked mark="*">{leadB}</Marked>
            {leadC}
            <bdi dir="ltr">&nbsp;&lt;alert&gt;</bdi>
            <bdi>{t.alert}</bdi>
            <bdi dir="ltr">&lt;/alert&gt;</bdi>
          </span>
        </div>
        <div className="t4">
          <bdi dir="ltr">&lt;chart type="bar" data="4,7,5,9,12" /&gt;</bdi>
        </div>
        <div className="t5">
          <bdi dir="ltr">&lt;progress value="72" /&gt;</bdi>
        </div>
      </div>

      <div className="lens-ring" aria-hidden="true" />
      <div className="lens-hint">
        <i />
        {t.hint}
      </div>
      <div className="lens-cta">
        <a className="pill pill-main" href={RELEASES}>
          <ArrowDownToLine className="size-4" />
          {t.download}
        </a>
        <a className="pill pill-ghost" href={REPO}>
          <GitHubMark className="size-4" />
          {t.source}
        </a>
      </div>
    </section>
  )
}
