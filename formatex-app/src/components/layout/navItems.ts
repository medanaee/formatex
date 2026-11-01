import { Blocks, Library, Settings, Sparkles, type LucideIcon } from "lucide-react"

export interface NavItem {
  to: "/" | "/components" | "/skill" | "/settings"
  icon: LucideIcon
  labelKey: "nav.library" | "nav.components" | "nav.skill" | "nav.settings"
}

/** The top-level destinations. Side navigation (tablet, desktop) and bottom navigation (phone) both render this list. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", icon: Library, labelKey: "nav.library" },
  { to: "/components", icon: Blocks, labelKey: "nav.components" },
  { to: "/skill", icon: Sparkles, labelKey: "nav.skill" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
]
