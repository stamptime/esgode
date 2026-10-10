TextField is the single-line input for search, forms and the message composer.

**You provide** `label` (always, except the toolbar search, which has a `placeholder` that names what it searches), `value`/`onChange` or `defaultValue`, and optionally `hint`, `error`, a `leading` icon.

Default is the filled style on `surface-sunken`, which reads on `surface-raised` cards. Set `outlined` when the field sits on a sunken ground so it keeps an edge (`border-control`). `error` replaces the hint, turns the edge `danger` and the text `danger-text`; write the fix, not the fault.

**Do** keep forms one column at 440px. **Don't** place a label inside the field as a placeholder, don't disable a field to show a read-only value — render it as text.

Tokens: 36px, `radius-md`, `space-3` inset, `body` text in `ink`, placeholder `ink-tertiary`, label and hint `callout` in `ink-secondary`, focus ring 2px `accent`.
