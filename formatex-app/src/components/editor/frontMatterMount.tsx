import { createRoot, type Root } from "react-dom/client"
import { FrontMatterPanel } from "@/components/editor/FrontMatterPanel"
import type { FrontMatterMount } from "@/lib/editor/livePreview"

const roots = new WeakMap<HTMLElement, Root>()

/** Puts the front matter's settings panel (React) into the element the editor's widget made. */
export const frontMatterMount: FrontMatterMount = {
  mount(element, props) {
    const root = createRoot(element)
    roots.set(element, root)
    root.render(<FrontMatterPanel {...props} />)
    ;(element as HTMLElement & { __unmount?: () => void }).__unmount = () => {
      root.unmount()
      roots.delete(element)
    }
  },
  update(element, props) {
    roots.get(element)?.render(<FrontMatterPanel {...props} />)
  },
}
