import { SettingsForm } from "@/components/editor/SettingsForm"
import { useConfigText } from "@/hooks/useConfigText"
import { TOML_FORMAT } from "@/lib/editor/settingsFormat"
import { tableNames } from "@/lib/editor/tomlEdit"
import { useSchemaStore } from "@/stores/useSchemaStore"

/** `config.toml` as a settings screen (the engine's `config` schema), in place of the source. */
export function ConfigPanel() {
  const [text, setText] = useConfigText()
  const config = useSchemaStore((state) => state.schema.config?.config)
  if (text === undefined || !config) return null
  return (
    <div className="h-full overflow-y-auto bg-background">
      <SettingsForm className="mx-auto max-w-2xl p-3 pb-8" text={text} onChange={setText} config={config} format={TOML_FORMAT} extraThemes={tableNames(text, "themes")} />
    </div>
  )
}
