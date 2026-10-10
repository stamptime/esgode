Badge names a state in one or two uppercase words.

**You provide** the word as children and a `tone`: `success` (pagado, entregado, ganado), `warning` (por pagar, pendiente, stock bajo), `danger` (cancelado, devolución, perdido), `accent` (nuevo, destacado), `neutral` (borrador, archivado). Add `dot` for live presence states.

The word is mandatory — tones are never shown as a bare dot or colour, because `success` and `danger` are the same lightness and differ only by hue.

**Don't** use a Badge as a button or a count; counts go in `data` text.

Tokens: 20px, `radius-sm`, `space-2` inset, `caption` uppercase; `*-soft` fill with `*-text` label.
