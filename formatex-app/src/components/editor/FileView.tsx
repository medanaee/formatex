import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { ColorPopover } from "@/components/editor/ColorPopover"
import { EditorContextMenu } from "@/components/editor/EditorContextMenu"
import { ConfigPanel } from "@/components/editor/ConfigPanel"
import { OptionsPopover } from "@/components/editor/OptionsPopover"
import type { ColorRequest } from "@/lib/editor/colorSwatches"
import type { ConfigureRequest } from "@/lib/editor/livePreview"
import { useFormFactor } from "@/hooks/useFormFactor"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { CONFIG_FILE, fileKindOf, isTextKind, openProjectFs, extensionOf } from "@/lib/projects"
import { useEditorStore } from "@/stores/useEditorStore"

const MIME: Record<string, string> = { svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp" }

function ImageViewer({ path }: { path: string }) {
  const { t } = useTranslation()
  const projectId = useEditorStore((state) => state.projectId)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    let revoked = false
    let created: string | null = null
    void openProjectFs(projectId)
      .then((fs) => fs.readBytes(path))
      .then((bytes) => {
        if (revoked) return
        created = URL.createObjectURL(new Blob([bytes as BlobPart], { type: MIME[extensionOf(path)] ?? "image/*" }))
        setUrl(created)
      })
      .catch(() => setUrl(null))
    return () => {
      revoked = true
      if (created) URL.revokeObjectURL(created)
      setUrl(null)
    }
  }, [projectId, path])

  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-muted/40 p-4">
      {url ? <img src={url} alt={path} className="max-h-full max-w-full rounded-sm bg-white object-contain ring-1 ring-border" draggable={false} /> : <span className="text-xs text-muted-foreground">{t("editor.image")}</span>}
    </div>
  )
}

/** What the editor area shows for the selected file: text in the editor, an image as an image, anything else as a note. */
export function FileView() {
  const { t } = useTranslation()
  const formFactor = useFormFactor()
  const path = useEditorStore((state) => state.activePath)
  const text = useEditorStore((state) => (path ? state.texts[path] : undefined))
  const reveal = useEditorStore((state) => state.reveal)
  const files = useEditorStore((state) => state.files)
  const visual = useSettingsStore((state) => state.visualEditor)
  const configVisual = useSettingsStore((state) => state.configVisual)
  const direction = useSettingsStore((state) => state.editorDirection)
  const [request, setRequest] = useState<ConfigureRequest | null>(null)
  const [colorRequest, setColorRequest] = useState<ColorRequest | null>(null)
  const paths = useMemo(() => files.filter((entry) => entry.kind === "file").map((entry) => entry.path), [files])

  if (!path) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("files.empty")}</div>

  const kind = fileKindOf(path)
  if (path === CONFIG_FILE && configVisual) return <ConfigPanel />
  if (kind === "image") return <ImageViewer path={path} />
  if (isTextKind(kind) && text !== undefined) {
    return (
      <>
      <EditorContextMenu markdown={kind === "markdown"}>
      <CodeEditor
        visual={visual}
        minimap={formFactor !== "phone"}
        direction={direction}
        onConfigure={setRequest}
        onPickColor={setColorRequest}
        path={path}
        kind={kind}
        value={text}
        files={paths}
        reveal={reveal}
        primary
        placeholder={t("editor.sourcePlaceholder")}
        onChange={(next) => useEditorStore.getState().edit(path, next)}
      />
      </EditorContextMenu>
      <OptionsPopover request={request} onRequestChange={setRequest} />
      <ColorPopover request={colorRequest} onRequestChange={setColorRequest} />
      </>
    )
  }
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
      {kind === "font" ? t("editor.fontFile") : t("editor.cannotShow")}
    </div>
  )
}
