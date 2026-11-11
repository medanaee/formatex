# ADR 0011: Native text clipboard for app menus

## Status

Accepted.

## Date

2026-11-10.

## Context

The editor and ordinary text fields draw their own Cut / Copy / Paste menus. Android's WebView does not reliably allow `navigator.clipboard.readText()` from those menu actions, so Paste can leave the text unchanged. Desktop image and file clipboard commands do not provide Android text clipboard access.

## Decision

- Register the official `tauri-plugin-clipboard-manager` plugin and use its JavaScript package for plain-text reads and writes inside Tauri.
- Grant only `clipboard-manager:allow-read-text` and `clipboard-manager:allow-write-text` to the main window.
- Share `readClipboardText` and `writeClipboardText` between the editor and ordinary text fields. Keep the browser clipboard as the web path and fallback.
- Keep image and file clipboard handling separate; Android support here is plain text.

## Alternatives rejected

- Relying only on the WebView Clipboard API: the custom Paste menu fails on Android.
- Reusing the desktop image/file clipboard commands: those are desktop-specific and do not read plain text on Android.

## Consequences

The app adds the official clipboard-manager dependency on the Rust and frontend sides. Menu actions can read and write Android text through the native plugin without broader clipboard permissions. Real Android testing is still required for menu focus, paste and multi-line selection.
