import { hydrateRoot } from "react-dom/client"
import { DocumentShell, type ShellData } from "./shell"
import { installPreviewBridge } from "./preview"

const shell = document.getElementById("fx-shell")
const settings = document.getElementById("fx-shell-data")
if (shell && settings) {
  const data = JSON.parse(settings.textContent ?? "{}") as ShellData
  const content = shell.querySelector("main.fx-doc")?.innerHTML ?? ""
  hydrateRoot(shell, <DocumentShell data={data} content={content} />)
}
installPreviewBridge()
