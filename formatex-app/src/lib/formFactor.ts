/**
 * Screen classes the layout adapts to. They follow the Tailwind breakpoints (`sm` = 640, `lg` = 1024) so a class like
 * `lg:flex` and `useFormFactor() === "desktop"` always agree.
 *
 * - phone:   < 640 px   single column, bottom navigation, sheets from the bottom
 * - tablet:  640-1023   navigation rail, two panes where it fits
 * - desktop: >= 1024    full sidebar, multi-pane
 */
export type FormFactor = "phone" | "tablet" | "desktop"

export const BREAKPOINTS = { tablet: 640, desktop: 1024 } as const

export function formFactorFor(width: number): FormFactor {
  if (width >= BREAKPOINTS.desktop) return "desktop"
  if (width >= BREAKPOINTS.tablet) return "tablet"
  return "phone"
}
