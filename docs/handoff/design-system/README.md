Esgode CRM is the back-office for the Esgode store (Yopal, Colombia; sells through Instagram @esgode.store). It is Apple-inspired: quiet neutrals, one blue accent, system type, generous radii, and hierarchy carried by weight and spacing rather than colour or decoration. Build every screen from these rules and the tokens they name.

## Content fundamentals

- Write the interface in Spanish (Colombia). Sentence case everywhere: "Pedidos recientes", never "Pedidos Recientes". Badge labels are the one exception — set them uppercase in `caption`.
- Address the operator as *tú*; never *usted*, never a mix.
- Verbs on buttons, nouns on headings. "Crear pedido", "Enviar recordatorio", "Marcar como pagado". No "OK" buttons: the primary action says what it does.
- Money is Colombian pesos, formatted `$ 189.900` (space after the sign, dot thousands, no decimals). Set money columns in `data` so digits align.
- Dates: "10 oct 2026, 08:14" in `footnote`; relative time ("hace 3 días") only in list secondary lines, never in detail views.
- Order and contact IDs read `ESG-2026-00418`, set in `data`.
- No emoji in the UI. Channel is shown by its glyph (`channel-instagram`, `channel-whatsapp`), not by a word or an emoji.
- Empty states: one `title-3` line stating what is missing, one `callout` line in `ink-secondary` saying how to add it, one primary Button. Example: "Aún no hay pedidos" / "Los pedidos que confirmes desde Instagram aparecerán aquí." / "Crear pedido".
- Errors name the fix, not the fault: "Escribe un número de WhatsApp con indicativo (+57…)", not "Número inválido".

## Visual foundations

### Colour

- The page is `surface`; everything that holds content is `surface-raised` with a 1px `hairline` outline and `shadow-card`. Do not stack a raised surface on another raised surface — nest with `surface-sunken` instead.
- `accent` is the only hue in the chrome. Use it for the primary Button fill, the on state of Toggle, the selected SegmentedControl label, the focus ring and links. One primary action per view.
- Text on `accent` is `on-accent` — it flips to black in dark because the accent lightens there. Never hard-code `#fff` on a blue fill.
- Blue text (links, plain and tinted buttons, selected sidebar label) is `accent-text`, not `accent`: `accent` as text falls to 4.3:1 on `surface` in light.
- Status is a Badge: `success-soft`/`success-text` (pagado, entregado, ganado), `warning-soft`/`warning-text` (pendiente, por pagar, stock bajo), `danger-soft`/`danger-text` (cancelado, devolución, perdido), `surface-sunken`/`ink-secondary` (borrador, archivado). Every badge carries a word: green and red fills differ by hue, not lightness, so the label does the work.
- `danger` is an icon, dot and edge colour only; the destructive Button is `danger-soft` with a `danger-text` label, because white on the red reads 3.5:1. Deleting a client or cancelling an order confirms in a sheet with the destructive button second.
- The two channel colours exist only for the 16px glyph next to a conversation or an order source. No channel-coloured fills, borders or text.

### Typography

- The UI face is the platform's: `sans` resolves to SF Pro on Apple devices and to Helvetica/Arial elsewhere. No web font is loaded for UI text.
- The brand face is `display` — Quicksand 700, loaded from Google Fonts (`https://fonts.googleapis.com/css2?family=Quicksand:wght@700&display=swap`). It is the closest open match to the storefront lettering (`assets/Logos/esgode-signage-reference.jpg`): a rounded geometric sans, lowercase, round `e` with a flat bar. Use it only for `wordmark`, `wordmark-sm` and `tagline`; never for headings, buttons or body.
- Hierarchy is weight and size: `title-1` for the screen name, `title-2` for sections and stat values, `title-3` for card and record titles, `headline` for the primary line of a list item, `body` for everything you read, `callout` for the secondary line, `footnote` for metadata, `caption` for badges and column headers.
- Negative letter-spacing is already in the styles from `title-3` up; do not add more, and do not track `body` or smaller.
- Numbers that line up in a column (prices, quantities, IDs) are `data`. Numbers in prose stay `body`.

### Spacing and layout

- The grid is 4px. Use only the `space-*` tokens; nothing is 6px, 10px or 14px.
- Shell: a 240px sidebar on `surface`, the content canvas on `surface` with `space-6` inset, an optional 360px inspector in `surface-raised` with `radius-xl` on its left corners.
- The screen title sits in a 56px header: `title-1` left, toolbar right (search TextField, SegmentedControl, primary Button, in that order, `space-3` apart).
- Cards: `space-4` padding, `radius-lg`, `hairline` outline, `shadow-card`. StatCards go four across with `space-4` gaps; below 1100px, two across.
- Tables fill their card edge to edge: `space-3` × `space-4` cell padding, 44px rows, a `hairline` rule between rows, header row on `surface-sunken` in `caption` + `ink-secondary`.
- Forms: one column, 440px max; label in `callout` + `ink-secondary` above the field, `space-2` gap; fields `space-4` apart; sections `space-5` apart with a `title-3` heading.

### Radii, borders and shadow

- Small things are `radius-sm`, controls `radius-md`, containers `radius-lg`, sheets `radius-xl`. The primary call to action and avatars are `radius-pill`.
- Borders are `hairline` at 1px unless they mean something. A field's edge and an unchecked box use `border-control` (3:1); a focus ring is 2px `accent` outside the control with 2px offset.
- Shadows are soft and never the only edge: `shadow-card` and `shadow-popover` always pair with a `hairline` outline so the edge survives in dark.

### States and motion

- Hover is a `surface-hover` wash on rows, list items and plain buttons; filled buttons go to `accent-hover`. Pressed darkens nothing further — Apple controls settle, they do not sink.
- Selected is `surface-selected` with the label in `accent-text`; the active sidebar item is the same pair.
- Disabled is `opacity-disabled` on the whole control, text untouched.
- Every transition is `duration-fast` with `ease-standard`; sheets and popovers use `duration-base`. Nothing bounces.

## Iconography

- On Apple platforms use SF Symbols at 17px regular, `ink-secondary` at rest and `accent-text` when selected. On the web, use Lucide (1.5px stroke) at 16px as the closest open match — this substitution is flagged: swap in SF Symbols where the runtime allows.
- The bundle ships a minimal `Icon` component with the glyphs the previews need (search, person, cart, chat, chart, plus, check, chevron, instagram, whatsapp). Treat them as placeholders for the icon set above, not as the system's icon library.
- Icons never carry meaning alone: a status icon has a Badge word, a channel glyph has a tooltip with the channel name.

## Logo

- The lockup reads **es·ode** in `wordmark`, lowercase, with `esgode-mark-ink.png` (or the white file) standing in for the g: the mark's top ring sits on the x-height and its lower ring hangs as the descender. Mark height = 1.35 × the font size, baseline offset 0.3 × the font size down; gap 0.05em each side. Under it, optionally, "tech store" in `tagline` left-aligned to the e.
- Never set "esgode" with a typed g, never capitalise it, never set it in `sans`. The wordmark "Esgode" in `title-3` (below) is for running text and the sidebar fallback only.
The Esgode mark lives in `assets/Logos`: `esgode-mark-ink.png` on light grounds, `esgode-mark-white.png` on dark grounds and on `accent`. Place it at 24px before the wordmark in SidebarNav (`logo` prop), 40px above the login title, 64px on empty states. Set the wordmark "Esgode" in `title-3`, never in the mark's file. Never recolour, redraw or stretch the mark; its source is 114px, so do not scale it past 64px until the store supplies an SVG. Usage per file: `assets/Logos/README.md`.

## Components

Each component folder holds guidelines and a live preview. Use them as defined; compose screens from them rather than restyling. Intentional additions beyond a minimal kit, each because a CRM needs it: `Avatar` (contacts everywhere), `StatCard` (dashboard), `SidebarNav` (shell), `DataTable` (every list screen).
