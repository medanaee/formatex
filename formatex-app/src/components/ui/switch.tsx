"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { cn } from "cn"

/**
 * Both sizes are a track with equal padding all round and a smaller round thumb, so the gap between thumb and track edge is
 * the same at the top, bottom and both ends: `sm` is 28 x 16 px with 4 px padding and an 8 px thumb, the default 36 x 20 px with
 * 3 px padding and a 14 px thumb. The thumb's shadow is a thin one-pixel line: the large drop shadow it used to have
 * made the thumb look pushed down inside its track.
 */
function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { size?: "default" | "sm" }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        size === "sm" ? "h-4 w-7 p-1" : "h-5 w-9 p-[3px] shadow-xs",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-[0_1px_2px_rgb(0_0_0/0.35)] ring-0 transition-transform data-[state=unchecked]:translate-x-0",
          size === "sm"
            ? "size-2 data-[state=checked]:translate-x-3 rtl:data-[state=checked]:-translate-x-3"
            : "size-3.5 data-[state=checked]:translate-x-4 rtl:data-[state=checked]:-translate-x-4"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
