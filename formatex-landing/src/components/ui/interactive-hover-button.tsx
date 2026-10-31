import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = React.ComponentProps<"a"> & { href?: string }

/** Interactive Hover Button from Magic UI (`npx shadcn@latest add @magicui/interactive-hover-button`); with an `href` it is a link. */
export function InteractiveHoverButton({ children, className, href, ...props }: Props) {
  const classes = cn(
    "group bg-background relative inline-block w-auto cursor-pointer overflow-hidden rounded-full border p-2 px-6 text-center font-semibold",
    className
  )
  const inner = (
    <>
      <div className="flex items-center justify-center gap-2">
        <div className="bg-primary h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-[100.8]"></div>
        <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">{children}</span>
      </div>
      <div className="text-primary-foreground absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100">
        <span>{children}</span>
        <ArrowRight className="rtl:rotate-180" />
      </div>
    </>
  )
  return href ? (
    <a href={href} className={classes} {...props}>
      {inner}
    </a>
  ) : (
    <button className={classes} {...(props as React.ComponentProps<"button">)}>
      {inner}
    </button>
  )
}
