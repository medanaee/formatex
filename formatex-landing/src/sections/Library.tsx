import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react"
import type { Copy, Lang } from "@/content"

/**
 * The eight themes of the app, with the colors of `formatex-typ/src/themes.typ` (only the ones the dial needs: the page and the accent).
 * The page itself is real: scripts/render-pages.py has the engine set one document in each theme.
 */
const THEMES = [
  { id: "paper", bg: "#ffffff", accent: "#2f6db5" },
  { id: "sepia", bg: "#f4ecd8", accent: "#b08d57" },
  { id: "ocean", bg: "#f5f9fc", accent: "#2b8cc4" },
  { id: "sage", bg: "#f6faf6", accent: "#1b7d4a" },
  { id: "midnight", bg: "#0f1419", accent: "#58a6ff" },
  { id: "nord", bg: "#2e3440", accent: "#81a1c1" },
  { id: "zinc", bg: "#0e0d0d", accent: "#519fff" },
  { id: "dracula", bg: "#282a36", accent: "#ff79c6" },
]
const FEELS = ["formal", "standard", "friendly"] as const
const STEP = 360 / THEMES.length

const pages = import.meta.glob("../assets/themes/*/*/*.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>

/** One real page, and a dial that turns it through the themes of the app. */
export function Library({ t, lang }: { t: Copy["library"]; lang: Lang }) {
  const [theme, setTheme] = useState(0)
  const [feel, setFeel] = useState<(typeof FEELS)[number]>("standard")
  const [angle, setAngle] = useState<number | null>(null)
  const [near, setNear] = useState(false)
  const section = useRef<HTMLElement>(null)
  const dial = useRef<HTMLDivElement>(null)
  const played = useRef(false)
  const dragging = useRef(false)

  // The pages (eight pictures) are asked for only when the section is near; once it is in view the dial turns by itself, once
  useEffect(() => {
    const node = section.current
    if (!node) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const early = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), { rootMargin: "700px" })
    const view = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || played.current) return
        played.current = true
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
        if (reduced) return
        ;[4, 7, 2].forEach((index, i) => timers.push(setTimeout(() => !dragging.current && setTheme(index), 1400 + i * 1500)))
      },
      { threshold: 0.4 },
    )
    // The pages of the other feels are fetched quietly, so a switch of feel shows at once
    const later = (callback: () => void) => ("requestIdleCallback" in window ? window.requestIdleCallback(callback) : setTimeout(callback, 600))
    const preload = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      preload.disconnect()
      later(() => Object.values(pages).forEach((url) => (new Image().src = url)))
    }, { rootMargin: "900px" })
    preload.observe(node)
    early.observe(node)
    view.observe(node)
    return () => {
      early.disconnect()
      preload.disconnect()
      view.disconnect()
      timers.forEach(clearTimeout)
    }
  }, [])

  const angleOf = (event: ReactPointerEvent) => {
    const rect = dial.current!.getBoundingClientRect()
    return ((Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180) / Math.PI + 90 + 360) % 360
  }
  const onMove = (event: ReactPointerEvent) => {
    if (!dragging.current) return
    const a = angleOf(event)
    setAngle(a)
    setTheme(Math.round(a / STEP) % THEMES.length)
  }
  const current = THEMES[theme]

  return (
    <section id="try" ref={section} className="mx-auto max-w-[1320px] px-[clamp(30px,4vw,48px)] py-28">
      <span className="eyebrow">{t.eyebrow}</span>
      <h2 className="h2">{t.title}</h2>
      <p className="lead">{t.text}</p>

      <div className="kitchen">
        <div className="panel">
          <h3>
            <span dir="ltr">
              {theme + 1} / {THEMES.length}
            </span>
            <span>{t.eyebrow}</span>
          </h3>
          <div className="dialwrap !mt-2 !border-t-0 !pt-0">
            <div
              ref={dial}
              className="dial"
              data-drag={angle !== null}
              onPointerDown={(event) => {
                dragging.current = true
                event.currentTarget.setPointerCapture(event.pointerId)
                setAngle(angleOf(event))
              }}
              onPointerMove={onMove}
              onPointerUp={() => {
                dragging.current = false
                setAngle(null)
              }}
            >
              <svg viewBox="0 0 132 132" aria-hidden="true">
                {THEMES.map((item, i) => {
                  const a = ((i * STEP - 90) * Math.PI) / 180
                  return <circle key={item.id} cx={66 + Math.cos(a) * 62} cy={66 + Math.sin(a) * 62} r={5} fill={item.bg} stroke={item.accent} strokeWidth={2.5} />
                })}
              </svg>
              <div className="knob" style={{ transform: `rotate(${angle ?? theme * STEP}deg)` }} />
            </div>
            <div className="themes">
              {t.themes.map((name, i) => (
                <button key={name} type="button" style={{ "--c": THEMES[i].bg, "--r": THEMES[i].accent } as CSSProperties} aria-pressed={theme === i} onClick={() => setTheme(i)}>
                  <i />
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="feelwrap">
            <h3>
              <span>{t.feelTitle}</span>
              <span dir="ltr">{FEELS.indexOf(feel) + 1} / {FEELS.length}</span>
            </h3>
            <div className="feels" role="radiogroup" aria-label={t.feelTitle}>
              {FEELS.map((id, i) => (
                <button key={id} type="button" role="radio" aria-checked={feel === id} data-feel={id} onClick={() => setFeel(id)}>
                  <b>{t.feels[i].name}</b>
                  <span>{t.feels[i].note}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="themepage" style={{ background: current.bg }}>
          {near &&
            THEMES.map((item, i) => (
              <img key={`${feel}-${item.id}`} src={pages[`../assets/themes/${lang}/${feel}/${item.id}.svg`]} alt="" data-on={i === theme} draggable={false} />
            ))}
        </div>
      </div>
    </section>
  )
}
