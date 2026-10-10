# Esgode CRM

Back-office de Esgode tech store (Yopal, Casanare). Primera capacidad: acceso por rol y módulo de crédito (calculadora para staff, tasas para administración).

## Correr en local

```bash
npm install
npm run dev      # http://localhost:3000
```

Usuarios:

| Usuario       | Rol   | Entra a        | Contraseña                 |
| ------------- | ----- | -------------- | -------------------------- |
| `esmer.gomez` | admin | `/admin/tasas` | la tiene administración    |
| `demo`        | staff | `/calculadora` | `demo2026`                 |

Para cambiar una contraseña, reemplaza el `hash` del usuario en `src/lib/seed.ts` por el SHA-256 de `usuario:contraseña`:

```bash
printf 'esmer.gomez:NUEVA_CLAVE' | sha256sum
```

## Qué hay

- `/login` — una pantalla para ambos roles; el rol vive en la cuenta.
- `/calculadora` — móvil. Lee las tasas activas y cotiza con amortización francesa.
- `/admin/tasas` — escritorio. Crear, editar, activar y eliminar tasas por categoría › marca › financiera.

## Estructura

- `docs/handoff/` — paquete de diseño original (fuente de verdad: `HANDOFF.md`, `design-system/`, `design/screens/`).
- `src/styles/` — `tokens.css` y `components.css` del sistema de diseño, tal cual el handoff.
- `src/app/globals.css` — Tailwind 4 mapeado a los tokens (colores por tema con `data-theme`, radios, fuentes).
- `src/components/ui/` — los 10 componentes del sistema portados a TSX (mismas clases y props).
- `src/lib/` — modelo de datos (`types.ts`), fórmula (`finanzas.ts`), formato es-CO (`formato.ts`), datos de ejemplo (`seed.ts`) y store (`store.ts`).

## Pendiente por decidir

- **Backend y autenticación.** Hoy no hay: los usuarios y el hash de sus contraseñas están en `src/lib/seed.ts` y se verifican en el navegador y las tasas se guardan en `localStorage` del navegador, así que no se comparten entre dispositivos. Sirve para demostración, no para datos sensibles.
- Financieras reales y sus reglas (comisiones, seguros, tasa plana); las actuales son placeholders.
- Usuarios y roles, y el resto del CRM (`docs/handoff/design-system/screens.md`). En el menú aparecen deshabilitados.
- Logo en SVG o alta resolución.
