# Feature: Responsive Layout

Decision record: [ADR 0004](../decisions/0004-responsive-layout-and-platforms.md). Code: [`formFactor.ts`](../../src/lib/formFactor.ts), [`useFormFactor.ts`](../../src/hooks/useFormFactor.ts), [`AppShell.tsx`](../../src/components/layout/AppShell.tsx).

## Screen classes

| Class | Width | Tailwind |
| :--- | :--- | :--- |
| phone | < 640 px | below `sm` |
| tablet | 640–1023 px | `sm` to below `lg` |
| desktop | ≥ 1024 px | `lg` and up |

## Shell

### Phone
- Page fills the screen; **bottom navigation** (`BottomNav`, `h-14`, `pb-safe`) lists the top-level destinations.
- Routes with `staticData.fullscreen` (the editor) hide the bottom bar, and on tablet and desktop the rail / sidebar too: they are environments of their own. The shell then applies `pb-safe` itself.
- Modals are bottom sheets (`ResponsiveDialog` → vaul `Drawer`).

### Tablet
- **Icon rail** (`SideNav compact`, 64 px) on the start side; page beside it.
- Modals are centered dialogs.

### Desktop
- **Sidebar** (224 px) with labels; the user can collapse it to the rail (`useSettingsStore.sidebarOpen`, persisted).
- Modals are centered dialogs. Editor shows source and preview side by side.

## Page patterns

- **Header:** `PageHeader`, one row, `h-14`; primary action on the end side; on a phone the "New" button shows only its icon (label is `sr-only`).
- **Grids:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- **Forms / settings:** centered, `max-w-xl`.
- **Scrolling:** the shell never scrolls; each page has one `overflow-y-auto` region.

## Adding a destination

1. Add the route in `src/router.tsx`.
2. Add an entry to `NAV_ITEMS` (`components/layout/navItems.ts`) with an icon and a `nav.*` key in both locale files.
3. Check all three classes.

## Testing

`formFactorFor` is unit-tested at the boundaries (`formFactor.test.ts`). Look at new screens at 360, 768 and 1280 px; in the Tauri window just resize it.
