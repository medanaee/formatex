import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { ColorPopover } from "@/components/editor/ColorPopover"
import { EditorContextMenu } from "@/components/editor/EditorContextMenu"
import { ConfigPanel } from "@/components/editor/ConfigPanel"
import { Button } from "@/components/ui/button"
import { lineCount } from "@/lib/projects/watch"
import { PdfViewer } from "@/components/editor/PdfViewer"
import { OptionsPopover } from "@/components/editor/OptionsPopover"
import { OverridePopover } from "@/components/editor/OverrideInfo"
import type { OverrideRequest } from "@/lib/editor/overrideGutter"
import { useFrontMatterEntries } from "@/hooks/useFrontMatterEntries"
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
  const plainTypst = useEditorStore((state) => state.kind) === "typst"
  const outside = useEditorStore((state) => (state.activePath ? state.conflicts[state.activePath] : undefined))
  const changedOutside = outside !== undefined
  const mine = useEditorStore((state) => (state.activePath ? state.texts[state.activePath] : undefined))
  const replaced = useEditorStore((state) => (state.activePath ? state.replaced[state.activePath] : undefined)) !== undefined
  const diagnostics = useEditorStore((state) => state.diagnostics)
  // The compiler's problems in this file, as lines to mark
  const problems = useMemo(() => diagnostics.filter((d) => d.path === path && d.line).map((d) => ({ line: d.line!, severity: d.severity, message: d.message })), [diagnostics, path])
  const visual = useSettingsStore((state) => state.visualEditor)
  const configVisual = useSettingsStore((state) => state.configVisual)
  const direction = useSettingsStore((state) => state.editorDirection)
  const [request, setRequest] = useState<ConfigureRequest | null>(null)
  const [colorRequest, setColorRequest] = useState<ColorRequest | null>(null)
  const [overrideRequest, setOverrideRequest] = useState<OverrideRequest | null>(null)
  const { entries: frontMatter, file: mainFile } = useFrontMatterEntries()
  const paths = useMemo(() => files.filter((entry) => entry.kind === "file").map((entry) => entry.path), [files])

  if (!path) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("files.empty")}</div>

  // In a plain Typst project a Markdown file or a config.toml is text like any other: no tags, no settings, no live preview
  const found = fileKindOf(path)
  const kind = plainTypst && (found === "markdown" || found === "toml") ? "text" : found
  if (!plainTypst && path === CONFIG_FILE && configVisual) return <ConfigPanel />
  if (kind === "image") return <ImageViewer path={path} />
  if (kind === "pdf") return <PdfViewer key={path} path={path} />
  if (isTextKind(kind) && text !== undefined) {
    return (
      <>
      <div className="flex h-full min-h-0 flex-col">
      {changedOutside && (
        <div role="alert" className="flex shrink-0 items-center gap-2 border-b border-border bg-muted px-3 py-1.5 text-xs">
          <span className="min-w-0 flex-1">
            {t("external.changed")}{" "}
            <span className="text-muted-foreground">{t("external.sizes", { mine: lineCount(mine ?? ""), outside: lineCount(outside ?? "") })}</span>
            {(outside ?? "").trim() === "" && <strong className="ms-1 text-destructive">{t("external.empty")}</strong>}
          </span>
          <Button size="xs" variant="outline" onClick={() => useEditorStore.getState().resolveConflict(path, true)}>
            {t("external.load")}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => useEditorStore.getState().resolveConflict(path, false)}>
            {t("external.keep")}
          </Button>
        </div>
      )}
      {replaced && (
        <div role="alert" className="flex shrink-0 items-center gap-2 border-b border-border bg-muted px-3 py-1.5 text-xs">
          <span className="min-w-0 flex-1">{t("external.replaced")}</span>
          <Button size="xs" variant="outline" onClick={() => useEditorStore.getState().restoreReplaced(path, true)}>
            {t("external.restore")}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => useEditorStore.getState().restoreReplaced(path, false)}>
            {t("external.dismiss")}
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1">
      <EditorContextMenu markdown={kind === "markdown"}>
      <CodeEditor
        visual={visual}
        minimap={formFactor !== "phone"}
        direction={direction}
        onConfigure={setRequest}
        onPickColor={setColorRequest}
        frontMatter={!plainTypst && path === CONFIG_FILE ? frontMatter : undefined}
        onOverrideInfo={setOverrideRequest}
        path={path}
        kind={kind}
        value={text}
        files={paths}
        reveal={reveal}
        problems={problems}
        primary
        placeholder={t("editor.sourcePlaceholder")}
        onChange={(next) => useEditorStore.getState().edit(path, next)}
      />
      </EditorContextMenu>
      </div>
      </div>
      <OptionsPopover request={request} onRequestChange={setRequest} />
      <ColorPopover request={colorRequest} onRequestChange={setColorRequest} />
      <OverridePopover request={overrideRequest} file={mainFile} onRequestChange={setOverrideRequest} />
      </>
    )
  }
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
      {kind === "font" ? t("editor.fontFile") : t("editor.cannotShow")}
    </div>
  )
}
