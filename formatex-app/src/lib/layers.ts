/**
 * Centralized layer elevation constants.
 *
 * Every UI element that needs a z-index MUST use one of these tiers so drawers, popovers, dialogs and toasts never collide.
 * Add a tier here instead of writing `z-[123]` in a component.
 */
export const LAYERS = {
  /** Page content (0) */
  CONTENT: "z-0",
  /** Sticky headers, sidebars, bottom navigation (10) */
  CHROME: "z-10",
  /** Floating toolbars and action buttons over content (40) */
  FLOATING: "z-40",
  /** Sliding drawers and sheets (60) */
  DRAWERS: "z-[60]",
  /** Dialogs and confirmations (70) */
  MODALS: "z-[70]",
  /**
   * Popover, dropdown, select and tooltip content (80). Above drawers and modals on purpose: a Select inside a Dialog is
   * portalled to <body> and must open over it.
   */
  POPOVERS: "z-[80]",
  /** Toasts, offline banners, system alerts (100) */
  NOTIFICATIONS: "z-[100]",
} as const

export type LayerName = keyof typeof LAYERS
