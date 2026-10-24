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
- `/contratos/nuevo` — celular. Formulario de 4 pasos (tipo, cliente, equipo, condiciones) para acuerdos de pago (a cuotas o un solo pago, con o sin intereses) y compraventas. El staff lo abre desde el menú de su cuenta en la calculadora.
- `/contratos/[id]` — contrato listo: firmar en el celular o descargar el PDF (original + 3 soportes: Cartera, Contabilidad, Archivo). `/contratos/[id]/firma` es la pantalla que firma el cliente (sin código SMS por ahora: acepta las condiciones y firma; se guardan fecha, hora y dispositivo). `/contratos/[id]/documento` es el documento en hojas carta; el PDF sale de «Guardar como PDF» al imprimir.
- `/admin/contratos` — registro: estado, plan de pagos, registrar pagos, copias descargadas y anular. En **Ajustes** se define la tasa mensual de los acuerdos con intereses y la usura del mes.
- `/admin/financieras`, `/admin/categorias`, `/admin/marcas`, `/admin/productos` — catálogos que configura el admin. Eliminar arrastra lo que depende (una categoría se lleva sus marcas, productos y tasas). Los productos activos aparecen en la calculadora para cargar el precio.

## Estructura

- `docs/handoff/` — paquete de diseño original (fuente de verdad: `HANDOFF.md`, `design-system/`, `design/screens/`).
- `src/styles/` — `tokens.css` y `components.css` del sistema de diseño, tal cual el handoff.
- `src/app/globals.css` — Tailwind 4 mapeado a los tokens (colores por tema con `data-theme`, radios, fuentes).
- `src/components/ui/` — los 10 componentes del sistema portados a TSX (mismas clases y props).
- `src/lib/` — modelo de datos (`types.ts`), fórmula (`finanzas.ts`), formato es-CO (`formato.ts`), datos de ejemplo (`seed.ts`) y la copia en el navegador de los datos del servidor (`store.ts`). Contratos: reglas, plan de pagos y estados (`contratos.ts`) y el texto de las plantillas originales con la paginación (`documento.ts`).
- `src/server/` — base de datos (`db.ts`), sesión en cookie firmada (`sesion.ts`) y las acciones del servidor que leen y escriben (`acciones.ts`, `contratos.ts`); cada una verifica sesión y rol.
- `scripts/db.mjs` — tablas, datos de ejemplo y usuarios.

## Pendiente por decidir

- Código por SMS al firmar en el celular (el diseño lo pide; falta elegir proveedor).
- Adjuntar el original escaneado de los contratos firmados en papel.
- Financieras reales y sus reglas (comisiones, seguros, tasa plana); las actuales son placeholders.
- El resto del CRM (`docs/handoff/design-system/screens.md`). En el menú aparecen deshabilitados.
- Logo en SVG o alta resolución.
