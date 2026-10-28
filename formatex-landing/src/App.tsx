import { ArrowDownToLine, Apple, Blocks, Eye, HardDrive, Languages, Monitor, Moon, Palette, PenLine, Smartphone, Sun, Terminal, type LucideIcon } from "lucide-react"
import { HeroMock } from "@/components/HeroMock"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { COPY, RELEASES, REPO, type Copy } from "@/content"
import { useLang, useTheme } from "@/lib/preferences"

const ICONS: Record<Copy["features"][number]["icon"], LucideIcon> = {
  languages: Languages,
  eye: Eye,
  blocks: Blocks,
  palette: Palette,
  pen: PenLine,
  "hard-drive": HardDrive,
}

const PLATFORM_ICONS: Record<Copy["platforms"][number]["icon"], LucideIcon> = {
  monitor: Monitor,
  apple: Apple,
  terminal: Terminal,
  smartphone: Smartphone,
}

/** The mark of GitHub (Lucide no longer ships brand icons). */
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

export default function App() {
  const [lang, toggleLang] = useLang()
  const [theme, toggleTheme] = useTheme()
  const t = COPY[lang]

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-4 px-4">
          <a href="#top" className="flex items-center gap-2 text-sm font-semibold">
            <img src="/icon.png" width={20} height={20} alt="" className="select-none" draggable={false} />
            {t.name}
          </a>
          <nav className="ms-2 hidden items-center gap-4 text-[13px] text-muted-foreground sm:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              {t.nav.features}
            </a>
            <a href="#how" className="transition-colors hover:text-foreground">
              {t.nav.how}
            </a>
            <a href="#download" className="transition-colors hover:text-foreground">
              {t.nav.download}
            </a>
          </nav>
          <span className="flex-1" />
          <Button variant="ghost" size="sm" onClick={toggleLang} lang={lang === "fa" ? "en" : "fa"}>
            {t.toggles.language}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label={t.toggles.theme} title={t.toggles.theme}>
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <Button variant="ghost" size="icon-sm" asChild>
            <a href={REPO} aria-label="GitHub" title="GitHub">
              <GitHubMark className="size-4" />
            </a>
          </Button>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pt-14 pb-12 md:grid-cols-[1.05fr_1fr] md:pt-20 md:pb-16">
          <div className="flex flex-col items-start gap-5">
            <img src="/icon.png" width={72} height={72} alt={t.name} className="size-16 select-none drop-shadow-sm sm:size-[72px]" draggable={false} />
            <Badge variant="secondary">{t.hero.platforms}</Badge>
            <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">{t.hero.title}</h1>
            <p className="max-w-prose text-[15px] leading-7 text-muted-foreground">{t.hero.lead}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" asChild>
                <a href={RELEASES}>
                  <ArrowDownToLine data-icon="inline-start" />
                  {t.hero.download}
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={REPO}>
                  <GitHubMark className="size-4" />
                  {t.hero.source}
                </a>
              </Button>
            </div>
          </div>
          <HeroMock />
        </section>

        <Separator />

        <section id="features" className="mx-auto max-w-5xl scroll-mt-12 px-4 py-14">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">{t.featuresTitle}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.map((feature) => {
              const Icon = ICONS[feature.icon]
              return (
                <Card key={feature.title} size="sm">
                  <CardContent className="flex flex-col gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Icon className="size-4" />
                    </span>
                    <h3 className="text-sm font-semibold">{feature.title}</h3>
                    <p className="text-[13px] leading-6 text-muted-foreground">{feature.text}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <Separator />

        <section id="how" className="mx-auto max-w-5xl scroll-mt-12 px-4 py-14">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">{t.howTitle}</h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {t.steps.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-xl border border-border p-4">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span>
                <div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Separator />

        <section id="download" className="mx-auto max-w-5xl scroll-mt-12 px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{t.downloadTitle}</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">{t.downloadText}</p>
            </div>
            <Button asChild>
              <a href={RELEASES}>
                <ArrowDownToLine data-icon="inline-start" />
                {t.getIt}
              </a>
            </Button>
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {t.platforms.map((platform) => {
              const Icon = PLATFORM_ICONS[platform.icon]
              return (
                <li key={platform.name} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{platform.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground" dir="auto">
                      {platform.note}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4 text-xs text-muted-foreground">
          <span>{t.footer}</span>
          <a href={REPO} className="transition-colors hover:text-foreground">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
