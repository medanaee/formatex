import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { SettingsSection } from "@/components/settings/sections"
import i18n, { applyLanguageSettings, DEFAULT_LANGUAGE, isSupportedLanguage, type AppLanguage } from "@/i18n"
import { SETTINGS_STORAGE_KEY } from "@/lib/persistedSettings"
import { createSafeJsonStorage } from "@/lib/safeStorage"
import type { CustomTheme } from "@/lib/editor/themes"
import { applyTheme, isThemePreference, watchSystemTheme, type ThemePreference } from "@/lib/theme"

export type SidebarTab = "files" | "outline" | "tags"

interface SettingsState {
  theme: ThemePreference
  language: AppLanguage
  /** Sidebar of the tablet / desktop layouts (the phone layout uses the bottom bar instead). */
  sidebarOpen: boolean
  /** The editor shows the visual (live preview) view of Markdown instead of plain source. */
  visualEditor: boolean
  /** config.toml is shown as a settings screen instead of source. */
  configVisual: boolean
  /** Base direction of the text editor: each line by its own letters, or everything right-to-left / left-to-right. */
  editorDirection: "auto" | "rtl" | "ltr"
  /** The editor's side panel: the project's files, its headings, or the tag palette. */
  sidebarTab: SidebarTab
  /** Width of the editor's side panel in px, and the share of the editor row the preview takes in percent (desktop). */
  treeWidth: number
  previewPercent: number
  /** The document themes the user made: available in every project. */
  customThemes: Record<string, CustomTheme>
  setCustomThemes: (themes: Record<string, CustomTheme>) => void
  /** The section of the settings screen being shown. */
  settingsSection: SettingsSection
  setSettingsSection: (section: SettingsSection) => void
  setConfigVisual: (visual: boolean) => void
  setVisualEditor: (visual: boolean) => void
  setEditorDirection: (direction: "auto" | "rtl" | "ltr") => void
  setSidebarTab: (tab: SidebarTab) => void
  setTreeWidth: (width: number) => void
  setPreviewPercent: (percent: number) => void
  setTheme: (theme: ThemePreference) => void
  setLanguage: (language: AppLanguage) => void
  toggleSidebar: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      language: isSupportedLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE,
      sidebarOpen: true,
      visualEditor: false,
      editorDirection: "auto",
      sidebarTab: "files",
      treeWidth: 240,
      previewPercent: 45,
      customThemes: {},
      setCustomThemes: (customThemes) => set({ customThemes }),
      settingsSection: "appearance",
      setSettingsSection: (settingsSection) => set({ settingsSection }),
      configVisual: true,
      setConfigVisual: (configVisual) => set({ configVisual }),
      setVisualEditor: (visualEditor) => set({ visualEditor }),
      setEditorDirection: (editorDirection) => set({ editorDirection }),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      setTreeWidth: (width) => set({ treeWidth: Math.round(Math.min(Math.max(width, 160), 480)) }),
      setPreviewPercent: (percent) => set({ previewPercent: Math.round(Math.min(Math.max(percent, 20), 70)) }),

      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
        watchSystemTheme(theme)
      },

      setLanguage: (language) => {
        set({ language })
        applyLanguageSettings(language)
        void i18n.changeLanguage(language)
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createSafeJsonStorage(),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // A stored value from an older / newer version may not be valid any more
        if (!isThemePreference(state.theme)) state.theme = "system"
        if (!isSupportedLanguage(state.language)) state.language = DEFAULT_LANGUAGE
        applyTheme(state.theme)
        watchSystemTheme(state.theme)
        applyLanguageSettings(state.language)
        void i18n.changeLanguage(state.language)
      },
    }
  )
)
