import { useCallback, useState } from "react"
import { ArrowDownToLine } from "lucide-react"
import { Intro } from "@/components/Intro"
import { GitHubMark } from "@/components/marks"
import { COPY, RELEASES, REPO } from "@/content"
import { useLang } from "@/lib/preferences"
import { Forge } from "@/sections/Forge"
import { Lens } from "@/sections/Lens"
import { Library } from "@/sections/Library"
import { Studio } from "@/sections/Studio"
import { Wall } from "@/sections/Wall"

export default function App() {
  const [lang, toggleLang] = useLang()
  const [intro, setIntro] = useState(true)
  const done = useCallback(() => setIntro(false), [])
  const t = COPY[lang]

  return (
    <div className="min-h-svh">
      {intro && <Intro onDone={done} />}

      <header className="pointer-events-none fixed inset-x-0 top-3 z-30 px-3 sm:top-4 sm:px-4">
        <div className="pointer-events-auto mx-auto flex h-13 max-w-5xl items-center gap-5 rounded-full border border-white/10 bg-background/55 px-5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl backdrop-saturate-150">
          <a href="#top" className="flex items-center gap-2.5 text-[15px] font-semibold">
            <img src="/icon.png" width={26} height={26} alt="" className="select-none" draggable={false} />
            {t.name}
          </a>
          <nav className="ms-3 hidden items-center gap-6 text-[13px] text-muted-foreground sm:flex">
            <a href="#how" className="transition-colors hover:text-foreground">
              {t.nav.how}
            </a>
            <a href="#components" className="transition-colors hover:text-foreground">
              {t.nav.components}
            </a>
            <a href="#forge" className="transition-colors hover:text-foreground">
              {t.nav.forge}
            </a>
            <a href="#download" className="transition-colors hover:text-foreground">
              {t.nav.download}
            </a>
          </nav>
          <span className="flex-1" />
          <button type="button" onClick={toggleLang} lang={lang === "fa" ? "en" : "fa"} className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t.toggles.language}
          </button>
          <a href={REPO} aria-label="GitHub" title="GitHub" className="text-muted-foreground transition-colors hover:text-foreground">
            <GitHubMark className="size-[18px]" />
          </a>
        </div>
      </header>

      <main>
        <Lens t={t.lens} dir={lang === "fa" ? "rtl" : "ltr"} />
        <Studio t={t.studio} />
        <Wall t={t.wall} />
        <Library t={t.library} />
        <Forge t={t.forge} />

        <section id="download" className="final">
          <img src="/icon.png" width={72} height={72} alt={t.name} className="mx-auto select-none drop-shadow-[0_10px_40px_#0a6bff66]" draggable={false} />
          <h2 className="h2 mx-auto max-w-2xl">{t.final.title}</h2>
          <p className="lead mx-auto">{t.final.text}</p>
          <div className="mt-7 flex justify-center gap-3">
            <a className="pill pill-main" href={RELEASES}>
              <ArrowDownToLine className="size-4" />
              {t.lens.download}
            </a>
            <a className="pill pill-ghost" href={REPO}>
              <GitHubMark className="size-4" />
              {t.lens.source}
            </a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">{t.final.platforms}</p>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-[clamp(20px,5vw,48px)] text-xs text-muted-foreground">
          <span>{t.footer}</span>
          <a href={REPO} className="transition-colors hover:text-foreground">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
