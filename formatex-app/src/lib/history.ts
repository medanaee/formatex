import { createBrowserHistory, createMemoryHistory, type RouterHistory } from "@tanstack/react-router"
import { isTauri } from "@/lib/platform"

/**
 * Inside the app (desktop and mobile) the route lives in memory: URL navigation interferes with native WebViews and the Android
 * back stack, and there is no address bar to show it in. In a browser the real history is used, so the web build gets working
 * URLs, reload and the browser's back button for free.
 */
export function createAppHistory(): RouterHistory {
  return isTauri() ? createMemoryHistory({ initialEntries: ["/"] }) : createBrowserHistory()
}
