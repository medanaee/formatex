import icon from "@/assets/icon.png"
import { cn } from "@/lib/utils"

interface AppLogoProps {
  size?: number
  className?: string
}

/** The app icon in its own colors (`src/assets/icon.png`); the same in light and dark. */
export function AppLogo({ size = 24, className }: AppLogoProps) {
  return <img src={icon} width={size} height={size} alt="" aria-hidden="true" draggable={false} className={cn("shrink-0 select-none", className)} />
}
