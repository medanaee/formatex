import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader title={t("notFound.title")} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <span>{t("notFound.body")}</span>
        <Button variant="outline" size="lg" asChild>
          <Link to="/">{t("editor.backToLibrary")}</Link>
        </Button>
      </div>
    </>
  )
}
