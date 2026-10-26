import { Blocks, Library, Settings, type LucideIcon } from "lucide-react"

export interface NavItem {
  to: "/" | "/components" | "/settings"
  icon: LucideIcon
  labelKey: "nav.library" | "nav.components" | "nav.settings"
}

/** The top-level destinations. Side navigation (tablet, desktop) and bottom navigation (phone) both render this list. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", icon: Library, labelKey: "nav.library" },
  { to: "/components", icon: Blocks, labelKey: "nav.components" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
]
