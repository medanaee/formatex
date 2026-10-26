import { useState, useEffect } from "react"

/**
 * Returns true when the viewport is in portrait orientation (height > width).
 */
export function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight > window.innerWidth : false
  )

  useEffect(() => {
    const check = () => {
      setIsPortrait(window.innerHeight > window.innerWidth)
    }

    check()
    window.addEventListener("resize", check)
    window.addEventListener("orientationchange", check)
    return () => {
      window.removeEventListener("resize", check)
      window.removeEventListener("orientationchange", check)
    }
  }, [])

  return isPortrait
}
