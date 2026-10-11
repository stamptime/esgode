# Esgode CRM

Back-office de Esgode tech store (Yopal, Casanare). Primera capacidad: acceso por rol y módulo de crédito (calculadora para staff, tasas para administración).

## Correr en local

```bash
npm install
vercel env pull .env.local   # DATABASE_URL (Neon) y SESSION_SECRET
npm run dev                  # http://localhost:3000
```

Local y producción usan la misma base de datos: lo que cambies en local se ve en el sitio.

## Usuarios

| Usuario       | Rol   | Entra a        | Contraseña              |
| ------------- | ----- | -------------- | ----------------------- |
| `esmer.gomez` | admin | `/admin/tasas` | la tiene administración |
| `demo`        | staff | `/calculadora` | `demo2026`              |

Los usuarios viven en la base de datos, con la contraseña cifrada (scrypt). Se administran en **Usuarios y roles** del escritorio. La consola sirve para crear el primer administrador o recuperar el acceso:

```bash
# crear un usuario, o cambiarle nombre, rol y contraseña
node --env-file=.env.local scripts/db.mjs usuario maria.perez "María Pérez" staff 'su-contraseña'
node --env-file=.env.local scripts/db.mjs desactivar maria.perez
# crear las tablas en una base nueva (carga datos de ejemplo si está vacía)
node --env-file=.env.local scripts/db.mjs setup
```

## Qué hay

- `/login` — una pantalla para ambos roles; el rol vive en la cuenta.
- `/calculadora` — celular y escritorio. Lee las tasas activas y cotiza con amortización francesa.
- `/admin/tasas` — escritorio. Crear, editar, activar y eliminar tasas por categoría › marca › financiera.
- `/admin/financieras`, `/admin/categorias`, `/admin/marcas`, `/admin/productos` — catálogos que configura el admin. Eliminar arrastra lo que depende (una categoría se lleva sus marcas, productos y tasas). Los productos activos aparecen en la calculadora para cargar el precio.

## Estructura

- `docs/handoff/` — paquete de diseño original (fuente de verdad: `HANDOFF.md`, `design-system/`, `design/screens/`).
- `src/styles/` — `tokens.css` y `components.css` del sistema de diseño, tal cual el handoff.
- `src/app/globals.css` — Tailwind 4 mapeado a los tokens (colores por tema con `data-theme`, radios, fuentes).
- `src/components/ui/` — los 10 componentes del sistema portados a TSX (mismas clases y props).
- `src/lib/` — modelo de datos (`types.ts`), fórmula (`finanzas.ts`), formato es-CO (`formato.ts`), datos de ejemplo (`seed.ts`) y la copia en el navegador de los datos del servidor (`store.ts`).
- `src/server/` — base de datos (`db.ts`), sesión en cookie firmada (`sesion.ts`) y las acciones del servidor que leen y escriben (`acciones.ts`); cada una verifica sesión y rol.
- `scripts/db.mjs` — tablas, datos de ejemplo y usuarios.

## Pendiente por decidir

- Financieras reales y sus reglas (comisiones, seguros, tasa plana); las actuales son placeholders.
- El resto del CRM (`docs/handoff/design-system/screens.md`). En el menú aparecen deshabilitados.
- Logo en SVG o alta resolución.
