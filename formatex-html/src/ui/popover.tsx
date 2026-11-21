import type { ComponentProps } from "react"
import { Popover as Primitive } from "radix-ui"
import { LAYERS } from "./messages"

// The same shadcn/Radix composition as the app, kept independent of native services.
export const Popover = Primitive.Root
export const PopoverTrigger = Primitive.Trigger
export const PopoverAnchor = Primitive.Anchor
export function PopoverContent({className="",sideOffset=6,...props}:ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal><Primitive.Content sideOffset={sideOffset} className={`fx-popover fx-chrome ${LAYERS.DRAWERS} ${className}`} {...props}/></Primitive.Portal>
}
