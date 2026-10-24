# Esgode CRM

Back-office de Esgode tech store (Yopal, Casanare). Primera capacidad: acceso por rol y módulo de crédito (calculadora para staff, tasas para administración).

## Correr en local

```bash
npm install
vercel env pull .env.local   # DATABASE_URL (Neon), SESSION_SECRET y BLOB_READ_WRITE_TOKEN
npm run dev                  # http://localhost:3000
```

Local y producción usan la misma base de datos y el mismo almacenamiento de fotos: lo que cambies en local se ve en el sitio. Después de cambiar `scripts/db.mjs`, aplica las migraciones con `node --env-file=.env.local scripts/db.mjs setup`.

## Pruebas

```bash
npm run lint           # ESLint
npm run format:check   # Prettier (npm run format corrige)
npm test               # reglas de contratos, plantillas y borrador local (Vitest)
npm run test:e2e       # flujo completo en el navegador (Playwright), con el servidor en :3123
```

Las pruebas de punta a punta corren contra `E2E_URL` (por defecto `http://localhost:3123`; arráncalo con `npx next dev -p 3123`). Usan la base y el almacenamiento reales: crean una cuenta de administración temporal (`prueba.e2e`) y contratos con «(PRUEBA E2E)» en el nombre, y los borran al terminar. Mientras corren, un contrato de prueba aprobado ocupa un número del consecutivo.

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
- Contratos: un contrato pasa por **borrador** (se edita, PDF con marca BORRADOR, sin número) → **aprobado** (administración lo aprueba, se asigna el número y se bloquea; volver a borrador quita la aprobación y conserva el número) → **firmado** (definitivo). La evidencia de entrega se agrega en cualquier etapa.
- `/contratos/nuevo` — celular. Formulario de 4 pasos (tipo y acreedor —Esmer Gómez Delgado o ELEX COMPANY SAS—, cliente con foto de la cédula, equipo con IMEI y fotos, condiciones con valor del producto, cuota inicial, periodicidad y tasa del contrato). Se guarda en el servidor al cambiar de paso o con «Guardar borrador»; `?borrador=<id>` sigue uno guardado.
- `/contratos` — celular, staff: borradores, por firmar y firmados de las últimas dos semanas. Se abre desde el menú de la cuenta en la calculadora.
- `/contratos/[id]` — revisión con el PDF, enviar a revisión, aprobar (solo administración), forma de firma, copias (Original + Contabilidad, Tienda, Gerencia), evidencias y la foto del original firmado en papel. `/contratos/[id]/firma` es la pantalla que firma el cliente: acepta las condiciones y firma en un recuadro a pantalla completa en horizontal (sin código SMS); se guardan fecha, hora y dispositivo. `/contratos/[id]/documento` es el documento en hojas carta con el anexo de evidencias fotográficas; el PDF sale de «Guardar como PDF» al imprimir.
- `/admin/contratos` — registro: borradores con su progreso, estado, plan de pagos, registrar pagos, evidencias, copias descargadas y anular con motivo. En **Ajustes** se define la tasa mensual sugerida y la usura del mes (ningún contrato se aprueba con una tasa mayor).
- Fotos: privadas en Vercel Blob (`esgode-contratos`); se suben por `/api/contratos/[id]/fotos` y se ven por `/api/contratos/[id]/fotos/[archivo]`, siempre con sesión.
- `/admin/financieras`, `/admin/categorias`, `/admin/marcas`, `/admin/productos` — catálogos que configura el admin. Eliminar arrastra lo que depende (una categoría se lleva sus marcas, productos y tasas). Los productos activos aparecen en la calculadora para cargar el precio.

## Estructura

- `docs/handoff/` — paquete de diseño original (fuente de verdad: `HANDOFF.md`, `design-system/`, `design/screens/`).
- `src/styles/` — `tokens.css` y `components.css` del sistema de diseño, tal cual el handoff.
- `src/app/globals.css` — Tailwind 4 mapeado a los tokens (colores por tema con `data-theme`, radios, fuentes).
- `src/components/ui/` — los 10 componentes del sistema portados a TSX (mismas clases y props).
- `src/lib/` — modelo de datos (`types.ts`), fórmula (`finanzas.ts`), formato es-CO (`formato.ts`), datos de ejemplo (`seed.ts`) y la copia en el navegador de los datos del servidor (`store.ts`). Contratos: reglas, plan de pagos y estados (`contratos.ts`) y el texto de las plantillas originales con la paginación (`documento.ts`).
- `src/server/` — base de datos (`db.ts`), sesión en cookie firmada (`sesion.ts`), las acciones del servidor que leen y escriben (`acciones.ts`, `contratos.ts`; cada una verifica sesión y rol), la lectura de contratos (`registro.ts`) y las fotos en Blob (`fotos.ts`).
- `tests/unit/` (Vitest) y `tests/e2e/` (Playwright).
- `scripts/db.mjs` — tablas, datos de ejemplo y usuarios.

## Pendiente por decidir

- Código por SMS al firmar en el celular (el diseño lo pide; se dejó por fuera por decisión de la tienda).
- Revisión legal del texto con ELEX COMPANY SAS y con cuotas semanales o quincenales (la cláusula de intereses sigue diciendo «de manera mensual»).
- Financieras reales y sus reglas (comisiones, seguros, tasa plana); las actuales son placeholders.
- El resto del CRM (`docs/handoff/design-system/screens.md`). En el menú aparecen deshabilitados.
- Logo en SVG o alta resolución.
