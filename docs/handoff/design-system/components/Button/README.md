Button is the single action control; its variant says how much it matters.

Use `primary` once per view for the action the screen exists for ("Crear pedido"), `secondary` for peers of equal weight ("Exportar"), `tinted` for an on/off filter or a soft confirm, `plain` for links inside content ("Ver todos") and `danger` only for a destructive, confirmed action.

**You provide** the label as children (a verb phrase in sentence case), optionally an `icon` name, and `onClick`. An icon-only button needs `label` for its accessible name.

**Sizes** — `sm` 28px in table rows and inline toolbars, `md` 36px (default) in headers and forms, `lg` 44px for the pill call-to-action on empty states and the dashboard.

**Do** set `pill` on a `primary` `lg` button when it stands alone. **Don't** put two primaries in one toolbar, don't use `danger` without a confirmation sheet, don't use `plain` for the main action of a form.

Tokens: fill `accent`/`accent-hover` with `on-accent` text; `surface-sunken` secondary; `surface-selected` + `accent-text` tinted; `danger-soft` + `danger-text` destructive; `radius-md` (`radius-sm` at sm, `radius-pill` when `pill`); focus ring 2px `accent`.
