import { useEffect } from "react"
import { RouterProvider } from "@tanstack/react-router"
import { TextFieldMenu } from "@/components/common/TextFieldMenu"
import { TooltipProvider } from "@/components/ui/tooltip"
import { installAndroidBackButton } from "@/lib/androidBack"
import { setCompilerThemes } from "@/lib/compiler"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { useSchemaStore } from "@/stores/useSchemaStore"
import { router } from "./router"

export default function App() {
  useEffect(() => {
    void installAndroidBackButton(router.history)
    // In the app: the user's themes go to the compiler (it adds them to the engine's), then the real schema is read, which has the
    // user's components and themes in it
    const handOver = () => void setCompilerThemes(useSettingsStore.getState().customThemes).then(() => useSchemaStore.getState().refresh())
    handOver()
    return useSettingsStore.subscribe((state, previous) => {
      if (state.customThemes !== previous.customThemes) handOver()
    })
  }, [])

  return (
    <TooltipProvider>
      <RouterProvider router={router} />
      <TextFieldMenu />
    </TooltipProvider>
  )
}
