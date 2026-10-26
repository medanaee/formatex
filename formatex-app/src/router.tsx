import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { AppShell } from "@/components/layout/AppShell"
import { createAppHistory } from "@/lib/history"
import { ComponentsPage } from "@/routes/ComponentsPage"
import { EditorPage } from "@/routes/EditorPage"
import { LibraryPage } from "@/routes/LibraryPage"
import { NotFoundPage } from "@/routes/NotFoundPage"
import { SettingsPage } from "@/routes/SettingsPage"

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
})

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LibraryPage,
})

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor/$documentId",
  component: EditorPage,
  // The editor is an environment of its own: no app navigation on any screen
  staticData: { fullscreen: true },
})

const componentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/components",
  component: ComponentsPage,
})

const componentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/components/$name",
  component: ComponentsPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([libraryRoute, editorRoute, componentsRoute, componentRoute, settingsRoute])

export const router = createRouter({
  routeTree,
  history: createAppHistory(),
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
  interface StaticDataRouteOption {
    /** The route is a full-screen environment: the shell shows no navigation around it. */
    fullscreen?: boolean
  }
}
