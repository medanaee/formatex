import { useEffect, useRef, type CSSProperties } from "react"
import { ChevronsUpDown } from "lucide-react"
import { GitHubMark } from "@/components/marks"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { LightRays } from "@/components/ui/light-rays"
import { TypingAnimation } from "@/components/ui/typing-animation"
import { RELEASES, REPO, type Copy } from "@/content"

/** A word between Markdown marks. Each part is its own isolate, so in a right-to-left line the marks stay on either side of the word. */
function Marked({ mark, children }: { mark: string; children: string }) {
  return (
    <>
      <bdi dir="ltr" className="dim">
        {mark}
      </bdi>
      <bdi className="m">{children}</bdi>
      <bdi dir="ltr" className="dim">
        {mark}
      </bdi>
    </>
  )
}

/**
 * The hero: the typeset headline on a screen that stays while the page scrolls. A line comes down from the top, like the handle of a
 * before and after slider turned sideways: above it the same rows are the Markdown they were set from, below it they are still the page.
 */
export function Lens({ t, dir, ready }: { t: Copy["lens"]; dir: "ltr" | "rtl"; ready: boolean }) {
  const track = useRef<HTMLElement>(null)
  const source = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const outer = track.current
    const layer = source.current
    const handle = line.current
    if (!outer || !layer || !handle) return
    let shown = 0
    let drawn = -1
    let frame = 0
    const tick = () => {
      const rect = outer.getBoundingClientRect()
      const span = Math.max(1, outer.offsetHeight - innerHeight)
      const progress = Math.min(1, Math.max(0, -rect.top / span))
      // The line is a little ahead of the scroll, so the last part of the track holds the finished source
      const target = Math.min(1, progress * 1.15)
      shown += (target - shown) * 0.14
      if (Math.abs(target - shown) < 0.0005) shown = target
      if (shown !== drawn) {
        drawn = shown
        const percent = shown * 100
        layer.style.clipPath = `inset(0 0 ${100 - percent}% 0)`
        handle.style.top = `${percent}%`
        handle.style.opacity = shown <= 0.002 || shown >= 0.998 ? "0" : "1"
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  // The first texts are typed, fast, one after the other, once the logo has gone
  const speed = 26
  let at = 120
  const type = (text: string, extra: { cursor?: boolean } = {}) => {
    const start = at
    at += Array.from(text).length * speed + 50
    return (
      <TypingAnimation key={`${text}-${start}`} startOnView={false} delay={start} duration={speed} showCursor={Boolean(extra.cursor)} blinkCursor={false} className="leading-[inherit] tracking-[inherit] whitespace-pre">
        {text}
      </TypingAnimation>
    )
  }
  const calm = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
  const [subA, subB, subC] = t.sub
  const [leadA, leadB, leadC] = t.lead
  return (
    <section ref={track} className="hero" id="top">
      <div className="lens hero-sticky">
        <div className="lens-glow" aria-hidden="true">
          <LightRays count={calm ? 0 : 8} color="rgba(141, 180, 255, 0.6)" length="85vh" />
          <LightRays count={calm ? 0 : 4} color="rgba(199, 155, 255, 0.5)" speed={19} length="75vh" />
        </div>
        <div className="lens-stack">
          <div className="t0">
            <img src="/logo.svg" alt={t.name} draggable={false} />
          </div>
          <div className="t1">{ready && !calm ? type(t.title, { cursor: true }) : calm ? t.title : null}</div>
          <div className="t2">
            <span>
              {ready && !calm ? type(subA) : calm ? subA : null}
              <b>{ready && !calm ? type(subB) : calm ? subB : null}</b>
              {ready && !calm && subC ? type(subC) : calm ? subC : null}
            </span>
          </div>
          <div className="t3">
            <span className="reveal" data-on={ready || calm} style={{ "--d": "300ms" } as CSSProperties}>
              {leadA}
              <em>{leadB}</em>
              {leadC}
              <span className="chip">{t.alert}</span>
            </span>
          </div>
          <div className="t4">
            <ol className="steps-h reveal" data-on={ready || calm} style={{ "--d": "150ms" } as CSSProperties}>
              {t.steps.map((step, i) => (
                <li key={step}>
                  <b>{i + 1}</b>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="t5">
            <div className="badges reveal" data-on={ready || calm} style={{ "--d": "0ms" } as CSSProperties}>
              {t.platforms.map((name, i) => (
                <span key={name} className="hbadge" style={{ "--h": ["var(--violet)", "var(--blue)", "var(--green)", "var(--violet)"][i] } as CSSProperties}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* The same rows as source, above the line. The row boxes are the same, so each line sits on the line it came from. */}
        <div ref={source} className="lens-stack lens-src" aria-hidden="true" dir={dir} style={{ clipPath: "inset(0 0 100% 0)" }}>
          <div className="t0">
            <bdi dir="ltr">
              <span className="k">&lt;img</span> <span className="a">src</span>=<span className="s">"/logo.svg"</span> <span className="k">/&gt;</span>
            </bdi>
          </div>
          <div className="t1">
            <span>
              <bdi dir="ltr" className="a">
                #&nbsp;
              </bdi>
              {t.title}
            </span>
          </div>
          <div className="t2">
            <span>
              <bdi dir="ltr" className="a">
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
              <bdi dir="ltr" className="k">
                &nbsp;&lt;alert&gt;
              </bdi>
              <bdi>{t.alert}</bdi>
              <bdi dir="ltr" className="k">
                &lt;/alert&gt;
              </bdi>
            </span>
          </div>
          <div className="t4">
            <bdi dir="ltr">
              <span className="k">&lt;steps&gt;</span>
              {t.steps.map((step) => (
                <span key={step}>
                  <span className="k">&lt;step&gt;</span>
                  <bdi dir="auto">{step}</bdi>
                  <span className="k">&lt;/step&gt;</span>
                </span>
              ))}
              <span className="k">&lt;/steps&gt;</span>
            </bdi>
          </div>
          <div className="t5">
            <bdi dir="ltr">
              {t.platforms.map((name) => (
                <span key={name}>
                  <span className="k">&lt;badge&gt;</span>
                  <bdi dir="auto">{name}</bdi>
                  <span className="k">&lt;/badge&gt;</span>{" "}
                </span>
              ))}
            </bdi>
          </div>
        </div>

        <div ref={line} className="lens-line" aria-hidden="true" style={{ top: "0%", opacity: 0 }}>
          <span className="tagl up mono">Markdown</span>
          <span className="tagl down mono">PDF</span>
          <span className="knob-h">
            <ChevronsUpDown className="size-5" />
          </span>
        </div>

        <div className="lens-hint">
          <i />
          {t.hint}
        </div>
        <div className="lens-cta">
          <InteractiveHoverButton href={RELEASES} className="h-[38px] border-white/25 py-0 text-sm leading-[36px]">
            {t.download}
          </InteractiveHoverButton>
          <a className="pill pill-ghost" href={REPO}>
            <GitHubMark className="size-4" />
            {t.source}
          </a>
        </div>
      </div>
    </section>
  )
}
