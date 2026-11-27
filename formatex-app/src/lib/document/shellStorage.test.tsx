// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { DocumentShell, FILE_STORAGE_PREFIX, GLOBAL_STORAGE_KEY, TASK_STORAGE_PREFIX, type ShellData } from "../../../../formatex-html/src/shell"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const baseData = (overrides: Partial<ShellData> = {}): ShellData => ({
  language: "en",
  toolbar: true,
  outline: true,
  progress: true,
  zoom: 100,
  theme: "paper",
  feel: "formal",
  width: "standard",
  themes: {
    paper: { bg: "#ffffff", fg: "#111111", rule: "#dddddd", accent: "#2255cc", dark: false },
    dracula: { bg: "#282a36", fg: "#f8f8f2", rule: "#44475a", accent: "#bd93f9", dark: true },
    ocean: { bg: "#f0f7ff", fg: "#0b2545", rule: "#b8d4f0", accent: "#0077b6", dark: false },
  },
  feels: {
    formal: { radius: 0, latin: "Inter", persian: "Vazirmatn" },
    friendly: { radius: 14, latin: "Lexend", persian: "Pelak" },
  },
  headings: [],
  ...overrides,
})

function setPath(pathname: string) {
  window.history.replaceState({}, "", pathname)
}

function mount(data: ShellData, content = "<p>Hello</p>") {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => { root.render(<DocumentShell data={data} content={content} />) })
  return {
    container,
    unmount: () => { act(() => { root.unmount() }); container.remove() },
  }
}

describe("DocumentShell per-file & global localStorage config", () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute("style")
    document.documentElement.removeAttribute("data-width")
    document.documentElement.removeAttribute("data-feel")
    document.documentElement.classList.remove("dark")
    setPath("/docs/file-a.html")
  })

  afterEach(() => {
    document.body.innerHTML = ""
    window.localStorage.clear()
  })

  it("auto-saves per-file overrides separately by path and auto-applies them on load", () => {
    setPath("/docs/file-a.html")
    const viewA = mount(baseData())
    const larger = viewA.container.querySelector<HTMLButtonElement>('button[aria-label="Larger text"]')!
    act(() => { larger.click() })

    expect(window.localStorage.getItem(`${FILE_STORAGE_PREFIX}/docs/file-a.html`)).toContain('"zoom":"110"')
    expect(window.localStorage.getItem(`${FILE_STORAGE_PREFIX}/docs/file-b.html`)).toBeNull()
    viewA.unmount()

    // Opening file-b does NOT inherit file-a's override
    setPath("/docs/file-b.html")
    const viewB = mount(baseData())
    expect(viewB.container.querySelector<HTMLElement>("main.fx-doc")?.style.fontSize).toBe("100%")
    viewB.unmount()

    // Re-opening file-a immediately applies its own saved override
    setPath("/docs/file-a.html")
    const viewA2 = mount(baseData())
    expect(viewA2.container.querySelector<HTMLElement>("main.fx-doc")?.style.fontSize).toBe("110%")
    viewA2.unmount()
  })

  it("saves global config on button click, does not auto-apply it, and applies it only when Apply Global is clicked", () => {
    setPath("/docs/file-a.html")
    const viewA = mount(baseData())

    const applyBtnA = viewA.container.querySelector<HTMLButtonElement>('button[aria-label="Apply global settings"]')!
    expect(applyBtnA.disabled).toBe(true)

    const larger = viewA.container.querySelector<HTMLButtonElement>('button[aria-label="Larger text"]')!
    act(() => { larger.click(); larger.click() }) // 120%

    const saveGlobalBtn = viewA.container.querySelector<HTMLButtonElement>('button[aria-label="Save as global settings"]')!
    act(() => { saveGlobalBtn.click() })

    expect(window.localStorage.getItem(GLOBAL_STORAGE_KEY)).toContain('"zoom":"120"')
    expect(applyBtnA.disabled).toBe(false)
    viewA.unmount()

    // Opening file-b does NOT auto-apply global config
    setPath("/docs/file-b.html")
    const viewB = mount(baseData())
    expect(viewB.container.querySelector<HTMLElement>("main.fx-doc")?.style.fontSize).toBe("100%")

    // Clicking Apply Global applies global config and auto-saves it as file-b's per-file override
    const applyBtnB = viewB.container.querySelector<HTMLButtonElement>('button[aria-label="Apply global settings"]')!
    expect(applyBtnB.disabled).toBe(false)
    act(() => { applyBtnB.click() })

    expect(viewB.container.querySelector<HTMLElement>("main.fx-doc")?.style.fontSize).toBe("120%")
    expect(window.localStorage.getItem(`${FILE_STORAGE_PREFIX}/docs/file-b.html`)).toContain('"zoom":"120"')

    // Clicking Reset restores file-b's HTML defaults and clears file-b's override without wiping global config
    const resetBtnB = viewB.container.querySelector<HTMLButtonElement>('button[aria-label="Reset viewer settings"]')!
    act(() => { resetBtnB.click() })

    expect(viewB.container.querySelector<HTMLElement>("main.fx-doc")?.style.fontSize).toBe("100%")
    expect(window.localStorage.getItem(`${FILE_STORAGE_PREFIX}/docs/file-b.html`)).toBeNull()
    expect(window.localStorage.getItem(GLOBAL_STORAGE_KEY)).toContain('"zoom":"120"')
    viewB.unmount()
  })

  it("completely bypasses localStorage when toolbar is disabled", () => {
    setPath("/docs/no-toolbar.html")
    window.localStorage.setItem(`${FILE_STORAGE_PREFIX}/docs/no-toolbar.html`, JSON.stringify({ theme: "dracula", feel: "friendly", zoom: "150", outline: "false", width: "wide" }))
    window.localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify({ theme: "ocean", feel: "friendly", zoom: "140", outline: "false", width: "narrow" }))

    const view = mount(baseData({ toolbar: false, zoom: 100, theme: "paper", feel: "formal", width: "standard" }))
    expect(view.container.querySelector("nav.fx-toolbar")).toBeNull()
    expect(view.container.querySelector<HTMLElement>("main.fx-doc")?.style.fontSize).toBe("100%")
    expect(document.documentElement.dataset.width).toBe("standard")
    expect(document.documentElement.dataset.feel).toBe("formal")
    // Existing storage entries were neither read nor wiped
    expect(window.localStorage.getItem(`${FILE_STORAGE_PREFIX}/docs/no-toolbar.html`)).toContain('"zoom":"150"')
    expect(window.localStorage.getItem(GLOBAL_STORAGE_KEY)).toContain('"zoom":"140"')
    view.unmount()
  })

  it("toggles editable task checkboxes, updates progress live, and persists state in localStorage per file", () => {
    setPath("/docs/tasks.html")
    const taskHtml = `
      <div class="fx-task-wrap" data-lang="en">
        <div class="fx-task-progress" role="progressbar" aria-valuemin="0" aria-valuemax="2" aria-valuenow="0">
          <div class="fx-task-progress-track"><div class="fx-task-progress-fill" style="width: 0%"></div></div>
          <span class="fx-task-progress-text">0 of 2 (0%)</span>
        </div>
        <ul class="fx-list fx-task-list" data-task-strike="1" data-task-editable="1">
          <li class="fx-task" data-checked="false" data-default-checked="false" data-task-id="t-1">
            <button type="button" role="checkbox" aria-checked="false" class="fx-checkbox"></button>
            <div class="fx-item"><div class="fx-task-label"><p>First</p></div></div>
          </li>
          <li class="fx-task" data-checked="false" data-default-checked="false" data-task-id="t-2">
            <button type="button" role="checkbox" aria-checked="false" class="fx-checkbox" disabled></button>
            <div class="fx-item"><div class="fx-task-label"><p>Locked</p></div></div>
          </li>
        </ul>
      </div>
    `
    const view1 = mount(baseData(), taskHtml)
    const buttons = view1.container.querySelectorAll<HTMLButtonElement>("button.fx-checkbox")
    act(() => { buttons[0].click() })

    expect(view1.container.querySelector('li[data-task-id="t-1"]')?.getAttribute("data-checked")).toBe("true")
    expect(buttons[0].getAttribute("aria-checked")).toBe("true")
    expect(view1.container.querySelector(".fx-task-progress-text")?.textContent).toBe("1 of 2 (50%)")
    expect(window.localStorage.getItem(`${TASK_STORAGE_PREFIX}/docs/tasks.html`)).toContain('"t-1":true')

    // Disabled checkbox cannot be toggled
    act(() => { buttons[1].click() })
    expect(view1.container.querySelector('li[data-task-id="t-2"]')?.getAttribute("data-checked")).toBe("false")
    view1.unmount()

    // Re-mounting restores saved task state and progress
    const view2 = mount(baseData(), taskHtml)
    expect(view2.container.querySelector('li[data-task-id="t-1"]')?.getAttribute("data-checked")).toBe("true")
    expect(view2.container.querySelector(".fx-task-progress-text")?.textContent).toBe("1 of 2 (50%)")
    view2.unmount()
  })
})
