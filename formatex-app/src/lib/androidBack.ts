import type { RouterHistory } from "@tanstack/react-router"
import { platformKind } from "@/lib/platform"

/**
 * Android's back button: go back in the router (which lives in memory, so the WebView history is empty); on the first screen
 * leave the app. Open dialogs and drawers are not part of the history, so they do not take the button yet: when one needs it,
 * keep a stack of open overlays here and close the top one before navigating.
 */
export async function installAndroidBackButton(history: RouterHistory): Promise<void> {
  if (platformKind() !== "android") return
  const { onBackButtonPress, exit } = await import("@tauri-apps/api/app")
  await onBackButtonPress(() => {
    if (history.canGoBack()) history.back()
    else void exit(0)
  })
}
