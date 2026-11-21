import { type ComponentProps, type ReactNode } from "react"
import { Button } from "./primitives"
import { Input } from "./primitives"
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./popover"

/** Document chrome shares shadcn primitives without importing the app shell. */
export function IconButton({ label, children, className = "", ...props }: ComponentProps<"button"> & { label: string }) {
  return <Button type="button" variant="ghost" size="icon" title={label} aria-label={label} className={`size-10 rounded-md ${className}`} {...props}>{children}</Button>
}
export function ToolButton({ children, ...props }: ComponentProps<typeof Button>) {
  return <Button type="button" variant="ghost" className="h-10 px-2 text-xs" {...props}>{children}</Button>
}
export function SearchInput(props: ComponentProps<typeof Input>) {
  return <Input type="search" className="h-10 min-w-0 text-sm" {...props} />
}
export function Panel({ children, className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-[var(--radius)] border border-border bg-background text-foreground ${className}`} {...props}>{children}</section>
}
export function ComponentHeader({ children }: { children: ReactNode }) {
  return <header className="flex items-center justify-between gap-2 border-b border-border bg-muted px-3 py-2 text-sm font-semibold">{children}</header>
}
export function Caption({ children }: { children: ReactNode }) {
  return <figcaption className="mt-2 text-center text-xs text-muted-foreground">{children}</figcaption>
}
