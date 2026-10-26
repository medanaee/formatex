import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { ArrowLeft, PanelLeft } from "lucide-react"
import { useTranslation } from "react-i18next"
import { AppLogo } from "@/components/common/AppLogo"
import { SETTINGS_SECTIONS } from "@/components/settings/sections"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LAYERS } from "@/lib/layers"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { NAV_ITEMS } from "./navItems"

interface SideNavProps {
  /** Icons only (a navigation rail): always on a tablet, on a desktop when the user collapsed the sidebar. */
  compact: boolean
  /** Shows the collapse / expand button (desktop only; the tablet rail has a fixed width). */
  collapsible: boolean
  onToggle: () => void
}

const itemClass = (compact: boolean) =>
  cn(
    "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground",
    compact && "w-9 justify-center px-0"
  )

/** While the settings screen is open, the items of the side bar are its sections, with a way back on top. */
function SettingsItems({ compact }: { compact: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const section = useSettingsStore((state) => state.settingsSection)
  const setSection = useSettingsStore((state) => state.setSettingsSection)

  return (
    <>
      <button type="button" onClick={() => void navigate({ to: "/" })} title={t("common.back")} aria-label={t("common.back")} className={itemClass(compact)}>
        <ArrowLeft className="size-4 shrink-0 rtl:rotate-180" />
        {!compact && <span className="truncate">{t("common.back")}</span>}
      </button>
      <div className="my-1 h-px w-full bg-sidebar-border" />
      {SETTINGS_SECTIONS.map(({ id, icon: Icon, labelKey }) => (
        <button key={id} type="button" data-active={section === id} onClick={() => setSection(id)} title={t(labelKey)} aria-label={t(labelKey)} className={itemClass(compact)}>
          <Icon className="size-4 shrink-0" />
          {!compact && <span className="truncate">{t(labelKey)}</span>}
        </button>
      ))}
    </>
  )
}

/** Navigation of tablet and desktop screens: the full sidebar or the icon rail. */
export function SideNav({ compact, collapsible, onToggle }: SideNavProps) {
  const { t } = useTranslation()
  const inSettings = useRouterState({ select: (state) => state.location.pathname.startsWith("/settings") })

  return (
    <nav
      aria-label={t("nav.primary")}
      className={cn(
        "flex shrink-0 flex-col gap-0.5 border-e border-sidebar-border bg-sidebar p-1.5 text-sidebar-foreground select-none transition-[width]",
        LAYERS.CHROME,
        compact ? "w-12 items-center" : "w-48"
      )}
    >
      <div className={cn("flex h-10 items-center gap-2 px-2", compact && "justify-center px-0")}>
        <AppLogo size={20} />
        {!compact && <span className="truncate text-[13px] font-semibold tracking-tight">{t("common.appName")}</span>}
      </div>

      {inSettings ? (
        <SettingsItems compact={compact} />
      ) : (
        NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <Link key={to} to={to} title={t(labelKey)} aria-label={t(labelKey)} activeOptions={{ exact: to === "/" }} className={itemClass(compact)}>
            <Icon className="size-4 shrink-0" />
            {!compact && <span className="truncate">{t(labelKey)}</span>}
          </Link>
        ))
      )}

      {collapsible && (
        <Button variant="ghost" size="icon-sm" className="mt-auto text-muted-foreground" onClick={onToggle} title={t("nav.toggleSidebar")} aria-label={t("nav.toggleSidebar")}>
          <PanelLeft className="rtl:rotate-180" />
        </Button>
      )}
    </nav>
  )
}
