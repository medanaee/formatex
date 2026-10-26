import { Link, useParams } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { EditorWorkspace } from "@/components/editor/EditorWorkspace"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { useLibraryStore } from "@/stores/useLibraryStore"

/** The editor route: its own full-screen environment (see `EditorWorkspace`), or a "not found" page. */
export function EditorPage() {
  const { t } = useTranslation()
  const { documentId } = useParams({ from: "/editor/$documentId" })
  const doc = useLibraryStore((state) => state.documents.find((item) => item.id === documentId))

  if (!doc) {
    return (
      <>
        <PageHeader title={t("editor.title")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
          <span>{t("editor.notFound")}</span>
          <Button variant="outline" size="lg" asChild>
            <Link to="/">{t("editor.backToLibrary")}</Link>
          </Button>
        </div>
      </>
    )
  }

  return <EditorWorkspace doc={doc} />
}
