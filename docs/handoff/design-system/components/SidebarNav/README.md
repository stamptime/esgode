SidebarNav is the CRM shell's left rail: wordmark, sections, and the signed-in operator.

**You provide** `items` in order — `{id, label, icon, count}` entries and `{section}` headers — the `activeId`, `onSelect(id)`, and `user` for the footer. `brand` defaults to the wordmark "Esgode"; pass `logo` with the mark from `assets/Logos` (`esgode-mark-ink.png` in light, `esgode-mark-white.png` in dark) to show it at 24px before the wordmark.

The rail is 240px on `surface`; the active item is `surface-selected` with its label and glyph in `accent-text`. Counts show open work (unanswered conversations, orders to pay), not totals that never change.

**Don't** nest items deeper than one section header, don't put actions ("Crear pedido") in the rail.

Tokens: items 32px, `radius-md`, `callout` labels; section headers `caption` uppercase in `ink-secondary`; counts `footnote` in `ink-tertiary`; hover `surface-hover`.
