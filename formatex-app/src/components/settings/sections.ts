import { Info, Palette, Paintbrush, Type, type LucideIcon } from "lucide-react"

export type SettingsSection = "appearance" | "themes" | "fonts" | "about"

export interface SettingsSectionItem {
  id: SettingsSection
  icon: LucideIcon
  labelKey: "settings.appearance" | "themes.title" | "fonts.title" | "settings.about"
}

/** The sections of the settings screen. On a tablet or desktop they replace the navigation items in the side bar. */
export const SETTINGS_SECTIONS: readonly SettingsSectionItem[] = [
  { id: "appearance", icon: Palette, labelKey: "settings.appearance" },
  { id: "themes", icon: Paintbrush, labelKey: "themes.title" },
  { id: "fonts", icon: Type, labelKey: "fonts.title" },
  { id: "about", icon: Info, labelKey: "settings.about" },
]
