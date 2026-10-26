import type { ReactNode } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/layout/PageHeader"
import { FontsSettings } from "@/components/settings/FontsSettings"
import { SETTINGS_SECTIONS } from "@/components/settings/sections"
import { ThemesSettings } from "@/components/settings/ThemesSettings"
import { SegmentedControl, type SegmentedOption } from "@/components/ui/segmented-control"
import { useFormFactor } from "@/hooks/useFormFactor"
import { LANGUAGES, SUPPORTED_LANGUAGES, type AppLanguage } from "@/i18n"
import { getStorage } from "@/lib/db"
import { platformKind } from "@/lib/platform"
import type { ThemePreference } from "@/lib/theme"
import { useSettingsStore } from "@/stores/useSettingsStore"

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
      <span>{label}</span>
      {children}
    </div>
  )
}

function Value({ children }: { children: ReactNode }) {
  return <span className="font-mono text-xs text-muted-foreground">{children}</span>
}

/** One section of the settings at a time: the side bar (tablet, desktop) or a strip on top (phone) chooses which. */
export function SettingsPage() {
  const { t } = useTranslation()
  const { theme, setTheme, language, setLanguage, settingsSection: section, setSettingsSection } = useSettingsStore()
  const formFactor = useFormFactor()

  const themeOptions: SegmentedOption<ThemePreference>[] = [
    { value: "light", label: t("settings.light"), icon: <Sun /> },
    { value: "dark", label: t("settings.dark"), icon: <Moon /> },
    { value: "system", label: t("settings.system"), icon: <Monitor /> },
  ]
  const languageOptions: SegmentedOption<AppLanguage>[] = SUPPORTED_LANGUAGES.map((code) => ({
    value: code,
    label: LANGUAGES[code].label,
  }))

  return (
    <>
      <PageHeader title={t("settings.title")} />
      {formFactor === "phone" && (
        <div className="shrink-0 border-b border-border p-2">
          <SegmentedControl
            value={section}
            onValueChange={setSettingsSection}
            label={t("settings.title")}
            compact
            className="w-full [&>*]:flex-1"
            options={SETTINGS_SECTIONS.map(({ id, icon: Icon, labelKey }) => ({ value: id, label: t(labelKey), icon: <Icon /> }))}
          />
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="mx-auto w-full max-w-xl space-y-4">
          {section === "appearance" && (
            <div className="divide-y divide-border rounded-xl border border-border bg-card text-card-foreground">
              <Row label={t("common.theme")}>
                <SegmentedControl value={theme} onValueChange={setTheme} options={themeOptions} label={t("common.theme")} compact />
              </Row>
              <Row label={t("common.language")}>
                <SegmentedControl value={language} onValueChange={setLanguage} options={languageOptions} label={t("common.language")} compact />
              </Row>
            </div>
          )}

          {section === "themes" && <ThemesSettings />}

          {section === "fonts" && (
            <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
              <FontsSettings />
            </div>
          )}

          {section === "about" && (
            <div className="divide-y divide-border rounded-xl border border-border bg-card text-card-foreground">
              <Row label={t("settings.version")}>
                <Value>{__APP_VERSION__}</Value>
              </Row>
              <Row label={t("settings.platform")}>
                <Value>{platformKind()}</Value>
              </Row>
              <Row label={t("settings.formFactor")}>
                <Value>{formFactor}</Value>
              </Row>
              <Row label={t("settings.storage")}>
                <Value>{getStorage()?.kind ?? "-"}</Value>
              </Row>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
