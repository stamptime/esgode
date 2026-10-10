DataTable is the list view of every CRM screen — clientes, pedidos, productos.

**You provide** `columns` (`key`, `label`, `align`, `mono` for IDs/money/counts, `render` for composed cells), `rows`, a `rowKey`, and `onRowClick` to open the inspector; pass `selectedKey` to keep the open row highlighted.

Columns read left to right: identity first (ID in `data`, or Avatar + name with a `callout` secondary line), then quantities right-aligned in `data`, then state as Badges, then dates in `ink-secondary`. Keep it to seven columns; more belongs in the inspector.

Pagination and sorting are the consumer's: render 25–50 rows and a footer with a `plain` Button "Cargar más". An empty result shows `emptyText` written as a sentence ("Ningún pedido coincide con la búsqueda.").

Tokens: container `es-card` edge to edge (`radius-lg`, `hairline`, `shadow-card`); header 36px on `surface-sunken` in `caption` + `ink-secondary`; rows 44px, `space-3`×`space-4` cells, `hairline` rules; hover `surface-hover`, selected `surface-selected`.
