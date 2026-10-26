# Design System & Ergonomics Guidelines (`docs/design-roles/guidelines.md`)

## 1. Compact & Minimal (mandatory)

Formatex is a working tool: the content (text, preview, files) gets the screen, the chrome gets out of the way. Every screen is **compact** (small, dense) and **minimal** (only what is needed). These rules are measurable; a review checks them.

| Aspect | Rule |
| :--- | :--- |
| **Type** | Chrome text is `text-xs` (12 px) or `text-[13px]` in lists and trees. `text-sm` only for the primary content of a page. A title in the chrome is `text-sm font-semibold`; nothing in the app chrome is larger. |
| **Bars** | Editor toolbar `h-11`; page header `h-14`; panel header `h-9`; status bar `h-8`; list / tree row `h-9`; bottom navigation `h-14`. The editor's chrome is at most 44 px on top and 32 px at the bottom: the text and the preview keep the rest. |
| **Controls** | Icon buttons `size-9` with a `size-4` icon; in-row buttons may be `size-6` only inside a row that is itself `h-9`. Inputs `h-9`/`h-10`. Radius no larger than `rounded-xl`. |
| **Spacing** | `gap-1` / `gap-2`; padding `p-2` / `p-3` (`sm:p-4` at most). Sections are separated by a 1 px `border-border` line, not by white space. |
| **Surfaces** | Flat. No gradients, no drop shadows (overlays get a 1 px ring), no glass blur except a sheet's backdrop. One border color. Muted fills (`bg-muted/40`) for secondary panels. |
| **Labels** | Toolbar actions are an icon with a tooltip and an `aria-label`. A text label is allowed on the one primary action, from `sm` up. Labels are 1–3 words. |
| **Words** | No helper paragraphs, no instructions in the chrome. An empty state is an icon and a title, with at most one short hint. Status is icons and numbers (`2 errors`, `1.2s`), not sentences. |
| **Emphasis** | One filled (primary) button per bar; everything else is ghost or outline. Destructive actions are never the primary one. |
| **Depth** | Secondary things sit one step away: a `⋯` menu for row actions, a collapsible problems list, a settings dialog. The default view shows only what the user needs while working. |
| **Motion** | Only functional: a spinner while waiting, short (≤ 200 ms) open/close transitions. No decorative animation. |

**The test before shipping a screen:** can anything be removed without losing a function? If yes, remove it. Does an addition push the content smaller? Justify it or drop it.

## 2. Adaptive Layout Architecture

Three screen classes, detected by width and defined once in [`src/lib/formFactor.ts`](../../src/lib/formFactor.ts):

| Class | Width | Navigation | Modals | Panes |
| :--- | :--- | :--- | :--- | :--- |
| **phone** | < 640 px | Bottom bar (`BottomNav`), hidden on full-screen routes | Bottom sheet (vaul `Drawer`) | One |
| **tablet** | 640–1023 px | Icon rail (`SideNav compact`) | Centered dialog | One, two where it fits |
| **desktop** | ≥ 1024 px | Sidebar (collapsible to the rail) | Centered dialog | Two or more (source + preview) |

Rules:

1. Use `useFormFactor()` when behavior (not just style) differs; use Tailwind `sm:` / `lg:` when only style differs. They share breakpoints.
2. Content width: forms and settings are centered with `max-w-xl`; grids grow columns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`), they do not stretch cards.
3. Orientation matters on tablets and phones: layouts must survive rotation without losing state.
4. Window resizing on desktop crosses all three classes; the app must work down to the minimum window size (360 × 480).
5. Safe areas: the shell pads `env(safe-area-inset-*)` (`pt-safe`, `pb-safe`, `ps-safe`, `pe-safe`). Pages never repeat it.

## 3. No Native Browser Controls

**Prohibited:** raw `<select>`, `<input type="checkbox|radio|file">`, `<dialog>`, default scrollbars, `alert()` / `confirm()`.

**Use:** `Select`, `DropdownMenu`, `Switch`, `SegmentedControl`, `Dialog`, `Drawer`, `Sheet`, `Popover`, `Tooltip`, and `ResponsiveDialog` for any short modal. The theme-aware slim scrollbar is set globally in `index.css`.

## 4. Light & Dark Themes

- Tokens are OKLCH variables: `:root` (light) and `.dark`. The preference is `light` / `dark` / `system`.
- Always pair a surface token with its foreground (`bg-card text-card-foreground`).
- Dark mode is a calibrated dark gray, not pure black; borders keep contrast (`--border`).
- Content that is itself a *document preview* (a rendered PDF page) keeps the page's own colors and is framed by the theme, not recolored.

## 5. Touch and Pointer

- Targets: icon buttons ≥ `size-9`, primary targets ≥ `h-10`, bottom-nav items `h-14`.
- `touch-manipulation` is set on `<body>` (no double-tap zoom delay). Pinch-zoom stays enabled for accessibility; a canvas that needs its own gestures sets `touch-action` locally.
- `select-none` belongs on chrome (nav, headers, toolbars), not on editor or preview text.
- Use `hasFinePointer()` only to enable *extras* (keyboard shortcut hints), never to gate functionality.

## 6. RTL & Typography

1. The default language is Persian (`dir="rtl"`); English is `ltr`. `<html dir lang>` follows the language ([`applyLanguageSettings`](../../src/i18n/index.ts)).
2. Fonts: **Inter** for Latin, **Vazirmatn** for Persian, system fallbacks (`--font-sans`).
3. Logical utilities only: `ms-*`/`me-*` (margin), `ps-*`/`pe-*` (padding), `start-*`/`end-*` (position), `border-s`/`border-e`, `rounded-s-*`/`rounded-e-*`, `text-start`/`text-end`.
4. Directional icons (back arrows, chevrons, sidebar toggles) flip with `rtl:rotate-180`.
5. User-entered text (titles, source) uses `dir="auto"` so each value follows its own language.
6. Numbers and dates follow the language: `Intl.DateTimeFormat("fa-IR" | "en-US")`.
