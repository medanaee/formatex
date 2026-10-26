# Design System Agent Guidelines (`docs/design-roles/AGENTS.md`)

Directives for any agent creating or changing UI in Formatex.

## 1. The Design Pillars

1. **One design language.** No isolated, one-off styles. Colors come from the tokens in [`src/index.css`](../../src/index.css); components derive from the shadcn/ui primitives in [`src/components/ui/`](../../src/components/ui).
2. **Light / dark parity.** Hard-coded colors (`bg-white`, `text-black`, hex) are forbidden. Use semantic tokens so contrast holds in both themes.
3. **Adaptive by construction.** Every screen is designed for phone, tablet and desktop together ([responsive layout spec](../features/responsive-layout.md)). Start from the phone (single column, thumb reach), then use the extra room on larger screens.
4. **Touch-safe.** Interactive targets are at least 40 px (`h-10` / `size-10`); icon-only buttons at least `size-9`. No hover-only affordances; every hover state has a focus / pressed equivalent.
5. **Compact and minimal (mandatory).** The app is dense, flat and quiet: small type, slim bars, icons with tooltips instead of labels, no explanatory text, no shadows or gradients, one primary button per bar. The numbers are in [guidelines §1](guidelines.md#1-compact--minimal-mandatory); read them before drawing anything.
6. **RTL-native.** Persian is the default language. Layout uses logical properties; directional icons flip with `rtl:rotate-180`.

## 2. Pre-Delivery UI Checklist

Before finishing any UI task, verify:

- [ ] Works at **360 px** (phone), **768 px** (tablet) and **1280 px** (desktop) with no horizontal scroll and no clipped content?
- [ ] Phone: reachable with one thumb; modal content opens as a bottom sheet (`ResponsiveDialog`)?
- [ ] Strings come from `t()` and exist in **both** `fa.json` and `en.json`?
- [ ] No raw `<select>`, checkbox, `<dialog>`, file input or default scrollbar?
- [ ] Logical classes only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `border-s/e`)? Checked in **RTL and LTR**?
- [ ] Only semantic color tokens? Checked in **light and dark**?
- [ ] Z-index through `LAYERS`? Popovers open above the dialog they live in?
- [ ] Safe-area insets untouched in the page (the shell owns them)?
- [ ] `select-none` on chrome (nav, headers, buttons), **not** on content the user may want to select or copy?
- [ ] **Compactness check:** toolbar ≤ `h-11`, rows `h-9`, chrome text `text-xs`/`text-[13px]`, no helper paragraphs, no shadow or gradient, one filled button per bar? Could anything be removed without losing a function?
- [ ] Docs and `tasks/todo.md` updated, in English?
