import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./i18n"
import "./index.css"
import App from "./App.tsx"
import { StorageBoot } from "./components/common/StorageBoot"
import { initTheme } from "./lib/theme"

// Before the first render: the theme of the first paint must already be the right one
initTheme()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StorageBoot>
      <App />
    </StorageBoot>
  </StrictMode>
)
