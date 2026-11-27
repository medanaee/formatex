import type { ComponentProps } from "react"

/** Small shadcn-style document primitives; no application-shell dependencies. */
export function Button({ variant = "ghost", size, className = "", ...props }: ComponentProps<"button"> & { variant?: "ghost" | "secondary" | "default"; size?: string }) {
  const appearance = variant === "default" ? "bg-primary text-primary-foreground" : variant === "secondary" ? "bg-muted text-foreground" : ""
  return <button type="button" data-slot="button" className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent text-xs font-medium outline-none disabled:opacity-45 [&_svg]:size-4 ${size === "icon" ? "size-8" : size === "auto" ? "" : "min-h-8 px-2.5"} ${appearance} ${className}`} {...props} />
}
export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={`h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`} {...props} />
}
