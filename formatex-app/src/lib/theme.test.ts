// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest"
import { SETTINGS_STORAGE_KEY } from "./persistedSettings"
import { applyTheme, initTheme, resolveTheme } from "./theme"

function systemPrefers(scheme: "dark" | "light") {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: scheme === "dark" && query.includes("dark"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.classList.remove("dark")
  localStorage.clear()
})

describe("theme", () => {
  it("resolves an explicit choice to itself and 'system' to the operating system's", () => {
    systemPrefers("dark")
    expect(resolveTheme("light")).toBe("light")
    expect(resolveTheme("dark")).toBe("dark")
    expect(resolveTheme("system")).toBe("dark")
    systemPrefers("light")
    expect(resolveTheme("system")).toBe("light")
  })

  it("switches the dark class on <html>", () => {
    systemPrefers("light")
    applyTheme("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    applyTheme("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("applies the saved theme before React starts", () => {
    systemPrefers("light")
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ state: { theme: "dark" }, version: 0 }))
    initTheme()
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("falls back to the system theme when the saved value is not valid", () => {
    systemPrefers("dark")
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ state: { theme: "neon" }, version: 0 }))
    initTheme()
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })
})
