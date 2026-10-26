import type { ReactNode } from "react"
import { cn } from "cn"
import { ToggleGroup } from "radix-ui"

interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: readonly SegmentedOption<T>[]
  /** Accessible name of the group. */
  label: string
  /** Slimmer items, for a crowded toolbar. */
  compact?: boolean
  className?: string
}

/** A row of mutually exclusive choices (theme, language). Built on Radix ToggleGroup; a choice cannot be switched off. */
function SegmentedControl<T extends string>({ value, onValueChange, options, label, compact, className }: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Clicking the selected item reports "": keep the current choice
      onValueChange={(next) => next && onValueChange(next as T)}
      aria-label={label}
      data-slot="segmented-control"
      className={cn("inline-flex w-fit rounded-lg bg-muted p-0.5 select-none", compact && "rounded-md", className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn("inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs [&_svg]:size-3.5", compact && "h-6 rounded-[5px] px-2 text-[11px]")}
        >
          {option.icon}
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}

export { SegmentedControl }
export type { SegmentedOption }
