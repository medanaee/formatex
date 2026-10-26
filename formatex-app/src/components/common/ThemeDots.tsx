import type { ThemeColor } from "@/lib/editor/themes"

/** Three overlapping dots that preview a theme: page, headings and accent. */
export function ThemeDots({ colors }: { colors: Partial<Record<ThemeColor, string>> }) {
  return (
    <span className="flex shrink-0 -space-x-1 rtl:space-x-reverse" aria-hidden>
      {(["bg", "heading", "accent"] as const).map((key) => (
        <span key={key} className="size-3.5 rounded-full border border-border" style={{ background: colors[key] }} />
      ))}
    </span>
  )
}
