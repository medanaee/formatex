import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  /** A back button or similar, before the title. */
  leading?: ReactNode
  /** The page title, or any element that stands in for it (an editable title). */
  title: ReactNode
  /** Buttons after the title. */
  actions?: ReactNode
  className?: string
}

/** The bar at the top of every page: compact (h-14), flat, one row. */
export function PageHeader({ leading, title, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 select-none sm:px-4", className)}>
      {leading}
      <div className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  )
}
