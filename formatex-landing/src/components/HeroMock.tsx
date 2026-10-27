import { cn } from "@/lib/utils"

/**
 * A drawing of the app: the Markdown on one side and the typeset page on the other. It is made of boxes, not a screenshot, so it is
 * sharp at every size and follows the theme. Always left-to-right: it shows an editor, whose chrome does not mirror.
 */
export function HeroMock({ className }: { className?: string }) {
  return (
    <div dir="ltr" aria-hidden="true" className={cn("overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs", className)}>
      <div className="flex h-8 items-center gap-1.5 border-b border-border bg-muted/50 px-3">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ms-3 text-[11px] text-muted-foreground">main.md</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border">
        <pre className="m-0 overflow-hidden p-3 font-mono text-[11px] leading-5 text-muted-foreground">
          <span className="text-foreground"># Quarterly report</span>
          {"\n\n"}
          Sales grew by <span className="text-foreground">**18%**</span>
          {"\n"}
          this quarter, led by
          {"\n"}
          the new <span className="text-foreground">plan</span>.{"\n\n"}
          <span className="text-foreground">{'<alert type="tip">'}</span>
          {"\n"}
          {"  "}Renewals open in May.{"\n"}
          <span className="text-foreground">{"</alert>"}</span>
          {"\n\n"}
          <span className="text-foreground">{"| Region | Sales |"}</span>
          {"\n"}
          {"|--------|-------|"}
          {"\n"}
          {"| North  | 120   |"}
        </pre>
        <div className="bg-muted/40 p-3">
          <div className="mx-auto flex aspect-[1/1.25] w-full max-w-[210px] flex-col gap-2 rounded-sm bg-white p-3 shadow-sm ring-1 ring-black/5">
            <div className="h-2.5 w-2/3 rounded-sm bg-neutral-800" />
            <div className="h-1 w-full rounded-sm bg-neutral-300" />
            <div className="h-1 w-11/12 rounded-sm bg-neutral-300" />
            <div className="h-1 w-3/4 rounded-sm bg-neutral-300" />
            <div className="mt-1 flex items-center gap-1.5 rounded-sm border border-teal-300 bg-teal-50 p-1.5">
              <span className="size-2 rounded-full bg-teal-500" />
              <div className="h-1 w-2/3 rounded-sm bg-teal-300" />
            </div>
            <div className="mt-1 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-neutral-200 bg-neutral-200">
              <div className="h-2 bg-neutral-100" />
              <div className="h-2 bg-neutral-100" />
              <div className="h-2 bg-white" />
              <div className="h-2 bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
