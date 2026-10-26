import { Outlet, useRouterState } from "@tanstack/react-router"
import { useFormFactor } from "@/hooks/useFormFactor"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { cn } from "@/lib/utils"
import { BottomNav } from "./BottomNav"
import { SideNav } from "./SideNav"
import { TitleBar } from "./TitleBar"

/**
 * The frame of every page, adapted to the screen:
 * - phone:   page + bottom navigation
 * - tablet:  icon rail + page
 * - desktop: sidebar (collapsible to the rail) + page
 * A route with `staticData.fullscreen` (the editor) gets no navigation at all, on any screen.
 * Safe-area insets (notch, rounded corners, home indicator) are padded here, so pages never think about them.
 */
export function AppShell() {
  const formFactor = useFormFactor()
  const sidebarOpen = useSettingsStore((state) => state.sidebarOpen)
  const toggleSidebar = useSettingsStore((state) => state.toggleSidebar)
  const fullscreen = useRouterState({ select: (state) => state.matches.some((match) => match.staticData?.fullscreen) })

  const phone = formFactor === "phone"
  const showBottomNav = phone && !fullscreen

  return (
    <div
      className={cn(
        "flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground pt-safe ps-safe pe-safe",
        !showBottomNav && "pb-safe"
      )}
    >
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        {!phone && !fullscreen && (
          <SideNav compact={formFactor === "tablet" || !sidebarOpen} collapsible={formFactor === "desktop"} onToggle={toggleSidebar} />
        )}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  )
}
