import type { ReactNode } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useFormFactor } from "@/hooks/useFormFactor"

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  /** Buttons; shown at the bottom. */
  footer?: ReactNode
  /** `lg` is wider on a tablet / desktop (an editor inside); a phone sheet is always full width. */
  size?: "md" | "lg"
}

/**
 * One modal for every screen: a bottom sheet on a phone (reachable with a thumb), a centred dialog on a tablet or desktop.
 * Use it for every short form or confirmation instead of choosing Dialog or Drawer per screen.
 */
export function ResponsiveDialog({ open, onOpenChange, title, description, children, footer, size = "md" }: ResponsiveDialogProps) {
  const formFactor = useFormFactor()

  if (formFactor === "phone") {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          {children && <div className="px-4">{children}</div>}
          {footer && <DrawerFooter className="pb-safe">{footer}</DrawerFooter>}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={size === "lg" ? "sm:max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
