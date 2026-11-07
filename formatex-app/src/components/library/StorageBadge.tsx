import { FolderSymlink } from "lucide-react"
import { useTranslation } from "react-i18next"

/** A small mark for a plain Typst project: a Formatex project, the usual kind, has none. */
export function KindBadge({ kind }: { kind: string | undefined }) {
  const { t } = useTranslation()
  if (kind !== "typst") return null
  return <span className="shrink-0 rounded border border-border px-1 font-mono text-[10px] leading-4 text-muted-foreground">{t("kind.badge")}</span>
}

/** A small mark for a project that is kept in a folder of the user (the path is in its tooltip). */
export function StorageBadge({ location }: { location: string | null | undefined }) {
  const { t } = useTranslation()
  if (!location) return null
  const label = t("storage.badge", { path: location })
  return <FolderSymlink className="size-3.5 shrink-0 text-muted-foreground" aria-label={label}><title>{label}</title></FolderSymlink>
}
