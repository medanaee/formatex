import { useCallback, useEffect, useState } from "react"
import { LiquidGlassLogo } from "@/components/liquid-glass-logo"
import { liquidGlassLogoDuration } from "@/components/liquid-glass-logo-renderer"

/** The first thing a visitor sees: the white logo arriving as liquid glass on black, then the page fades in under it. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const leave = useCallback(() => setLeaving(true), [])

  // The page behind does not scroll while the logo plays
  useEffect(() => {
    const root = document.documentElement
    root.style.overflow = "hidden"
    return () => {
      root.style.overflow = ""
    }
  }, [])

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const timer = setTimeout(leave, reduced ? 900 : liquidGlassLogoDuration * 1000 + 600)
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && leave()
    addEventListener("keydown", onKey)
    return () => {
      clearTimeout(timer)
      removeEventListener("keydown", onKey)
    }
  }, [leave])

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(onDone, 700)
    return () => clearTimeout(timer)
  }, [leaving, onDone])

  return (
    <div className="intro" data-leaving={leaving} onClick={leave} role="presentation">
      <LiquidGlassLogo logo="/logo.svg" ending="logo" style={{ height: 480 }} aria-label="Formatex" />
    </div>
  )
}
