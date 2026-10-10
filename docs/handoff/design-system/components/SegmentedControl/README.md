SegmentedControl switches one view between a few mutually exclusive filters.

**You provide** `options` (2–6, each `value`, `label`, optional `count`), the current `value`, `onChange` and a `label` naming the group ("Filtrar pedidos").

Use it in the screen header for list scopes — Todos · Por pagar · Pagados. For more than six scopes, or scopes that combine, use a filter popover instead. The selected segment is the raised thumb (`surface-raised` + `shadow-thumb`) with its label in `ink` at 600; the others are `ink-secondary`.

**Don't** use it for actions or navigation, and don't mix it with tabs on one screen.

Tokens: track `surface-sunken`, `radius-md`, 28px segments, `callout` labels, counts in `ink-tertiary`, motion `duration-fast`.
