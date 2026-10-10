# CRM screens

The five screens the CRM is built from, each composed only from the components in this system. Build them in this order.

## Shell

`SidebarNav` (240px) on the left with the sections **Inicio, Clientes, Pedidos, Conversaciones, Productos, Informes**; the operator's `Avatar` and name at the bottom. The content canvas carries a 56px header (`title-1` + toolbar) and a `space-6` inset. An inspector (360px, `surface-raised`, `radius-xl` left corners) slides in from the right on row selection with `duration-base`.

## Inicio (dashboard)

Four `StatCard`s across: **Ventas del mes**, **Pedidos abiertos**, **Clientes nuevos**, **Conversaciones sin responder**. Each has a delta vs. the previous period. Below, two cards side by side: "Pedidos recientes" (`DataTable`, 5 rows, link "Ver todos" in `accent-text`) and "Por responder" (list of conversations with channel glyph, `Avatar`, `headline` name, `callout` snippet, `footnote` time).

## Clientes

Toolbar: search `TextField` ("Buscar por nombre, @usuario o teléfono"), `SegmentedControl` **Todos · Frecuentes · Nuevos · Inactivos**, primary `Button` "Nuevo cliente". `DataTable` columns: Cliente (`Avatar` + name + @instagram in `callout`), Canal (glyph), Pedidos (`data`, right), Total comprado (`data`, right), Última compra (`footnote`), Estado (`Badge`). Selecting a row opens the inspector with contact details, address, notes and the order history.

## Pedidos

Toolbar: search, `SegmentedControl` **Todos · Por pagar · Pagados · Enviados · Entregados · Cancelados**, "Crear pedido". `DataTable` columns: Pedido (`data` ID), Cliente, Artículos (count), Total (`data`), Pago (`Badge`), Envío (`Badge`), Fecha. Row actions in the inspector: "Marcar como pagado" (primary), "Registrar guía", "Cancelar pedido" (plain, `danger-text`, confirms in a sheet).

## Conversaciones

Two panes inside one card: a 320px list (channel glyph, `Avatar`, name, snippet, time, unread dot in `accent`) and the thread. Messages are `body` in `surface-sunken` bubbles (`radius-lg`); the operator's in `surface-selected`. Composer: `TextField` with a plain `Button` "Adjuntar" and a primary pill `Button` "Enviar". A `Badge` in the thread header shows the linked order if one exists.

## Productos

Grid of cards (image, `headline` name, `data` price, `Badge` stock state) with a `SegmentedControl` **Activos · Agotados · Archivados**. Stock below 3 units shows the `warning` badge "STOCK BAJO".
