# ADR 0001: Baseline Tech Stack (Tauri v2 + React 19 + Tailwind v4 + shadcn/ui)

- **Status:** Accepted
- **Date:** October 2026

## Context

Formatex needs one codebase for Windows, macOS, Linux and Android, and later the web. It has a Persian-first (RTL) interface with light and dark themes, and an editor that works on a phone, a tablet and a desktop. The typesetting engine (Typst) is written in Rust and also exists as WebAssembly.

## Decision

1. **Tauri v2** as the native shell. The backend is Rust; on mobile the crate builds as a library (`cdylib` / `staticlib`) loaded by the Android (and later iOS) host. Small binaries, system WebView, a capability-based permission model.
2. **React 19 + TypeScript + Vite** for the frontend. The same frontend bundle is the web build.
3. **Tailwind CSS v4 + shadcn/ui (Radix, `radix-nova` style, RTL on) + Lucide**: tokenized design (OKLCH variables), accessible primitives whose source we own, one icon set.
4. **Same stack as the Docium app** (`D:\Projects\Docium`), deliberately, so that conventions, components and agent rules carry over between the two projects.

## Alternatives Rejected

- **Electron:** large runtime, no mobile.
- **Flutter / native per platform:** the editor and preview would be rewritten per platform; Typst integration is harder.
- **Capacitor + Tauri:** two shells; Tauri v2 covers desktop and mobile alone.

## Consequences

- Positive: one UI codebase, small installers, direct Rust access when needed (e.g. a native Typst compiler later).
- Trade-offs: WebView differences between platforms (WebView2, WKWebView, WebKitGTK, Android System WebView) must be tested; Tauri mobile is younger than desktop; Android development needs the SDK, NDK and JDK installed.
