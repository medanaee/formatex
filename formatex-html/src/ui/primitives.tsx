import type { ComponentProps } from "react"

/** Small shadcn-style document primitives; no application-shell dependencies. */
export function Button({ variant = "ghost", size, className = "", ...props }: ComponentProps<"button"> & { variant?: "ghost" | "secondary" | "default"; size?: string }) {
  const appearance = variant === "default" ? "bg-primary text-primary-foreground" : variant === "secondary" ? "bg-muted text-foreground" : "bg-transparent text-foreground hover:bg-muted"
  return <button type="button" data-slot="button" className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-transparent text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 [&_svg]:size-4 ${size === "icon" ? "size-10" : size === "auto" ? "" : "h-10 px-2"} ${appearance} ${className}`} {...props} />
}
export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={`h-10 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`} {...props} />
}
