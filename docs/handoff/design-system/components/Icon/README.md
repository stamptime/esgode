Icon renders one of the bundle's placeholder glyphs at 16px or 20px in `currentColor`.

These twelve glyphs exist so previews and the first screens can be built; the system's icon set is SF Symbols on Apple platforms and Lucide on the web (README › Iconography). Replace them as that set lands.

**You provide** `name`, and `label` when the icon is the only thing conveying meaning (then it is exposed as an image); without `label` it is hidden from assistive technology.

Colour comes from the parent: `ink-secondary` at rest, `accent-text` when selected. `instagram` and `whatsapp` take their channel token automatically and are the only coloured glyphs.
