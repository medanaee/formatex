import { create } from "zustand"

interface HtmlSourceState {
  available: boolean
  target: { path: string; offset: number; flash: boolean; id: number } | null
  show: (path: string, offset: number, flash: boolean) => void
}
let serial = 0
export const useHtmlSourceStore = create<HtmlSourceState>()((set) => ({
  available: false,
  target: null,
  show: (path, offset, flash) => set({ target: { path, offset, flash, id: ++serial } }),
}))
