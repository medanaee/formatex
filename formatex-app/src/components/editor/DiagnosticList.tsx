import { AlertCircle, AlertTriangle } from "lucide-react"
import type { Diagnostic } from "@/lib/compiler"
import { cn } from "@/lib/utils"

interface DiagnosticListProps {
  diagnostics: Diagnostic[]
  /** A click on a problem's place (`path:line`). */
  onGo: (diagnostic: Diagnostic) => void
  className?: string
}

/** The problems of a compilation: severity icon, message, hints, and the place, which is a button. */
export function DiagnosticList({ diagnostics, onGo, className }: DiagnosticListProps) {
  return (
    <ul className={cn("divide-y divide-border overflow-y-auto bg-background", className)}>
      {diagnostics.map((diagnostic, index) => {
        const Icon = diagnostic.severity === "error" ? AlertCircle : AlertTriangle
        const place = diagnostic.path ? `${diagnostic.path}${diagnostic.line ? `:${diagnostic.line}` : ""}` : null
        return (
          <li key={index} className="flex gap-2 px-3 py-1.5 text-xs">
            <Icon className={cn("mt-0.5 size-3.5 shrink-0", diagnostic.severity === "error" ? "text-destructive" : "text-muted-foreground")} />
            <div className="min-w-0 flex-1">
              <div dir="auto" className="break-words">{diagnostic.message}</div>
              {diagnostic.hints.map((hint) => (
                <div key={hint} dir="auto" className="break-words text-muted-foreground">{hint}</div>
              ))}
            </div>
            {place && (
              <button type="button" onClick={() => onGo(diagnostic)} dir="ltr" className="h-fit shrink-0 rounded px-1 font-mono text-[11px] text-muted-foreground underline-offset-2 hover:underline">
                {place}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
