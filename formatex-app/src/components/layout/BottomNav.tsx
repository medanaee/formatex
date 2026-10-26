import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { LAYERS } from "@/lib/layers"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "./navItems"

/** Navigation of phone screens: a bar at the bottom, where the thumb is. Respects the home-indicator safe area. */
export function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t("nav.primary")}
      className={cn("flex shrink-0 border-t border-border bg-background pb-safe select-none", LAYERS.CHROME)}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground outline-none transition-colors focus-visible:bg-muted data-[status=active]:text-foreground"
        >
          <Icon className="size-5" />
          <span>{t(labelKey)}</span>
        </Link>
      ))}
    </nav>
  )
}
