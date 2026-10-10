# Esgode CRM — handoff para Claude Code

Paquete de diseño listo para implementar. Dos fuentes de verdad, en este orden:

1. `design-system/` — tokens, reglas de marca y componentes de referencia (React 18, sin build).
2. `design/screens/` — las tres pantallas aprobadas, con su lógica de estado y los datos de ejemplo.

Artefactos en vivo (siguen editables; Claude Code puede leerlos directamente con su herramienta de artefactos):

- Sistema de diseño: https://claude.ai/code/artifact/b45ed9b4-e05e-4a38-ad27-09e8e5ad0070
- Pantallas (canvas): https://claude.ai/artifact/J6HaoFLWkmH13Xwa9sF23V

## Qué construir primero

1. **Login** (`design/screens/Main.dc.html`) — una sola pantalla para ambos roles. El rol vive en la cuenta; tras entrar, `staff` → Calculadora, `admin` → escritorio.
2. **Calculadora** (`design/screens/Calculadora.dc.html`) — móvil, para staff. Lee las tasas que definió el admin; nunca las edita.
3. **Tasas** (`design/screens/Tasas.dc.html`) — escritorio, para admin. CRUD de tasas con inspector lateral.

Cada pantalla tiene su versión oscura (`*Dark.dc.html`): es la misma pantalla con `theme="dark"`. El tema se aplica con `data-theme="dark"` en el root; `tokens.css` ya trae ambos temas.

## Modelo de datos (del artboard Tasas)

```ts
type TipoTasa = 'mensual' | 'ea';            // mensual o efectiva anual
type Rol = 'admin' | 'staff';

interface Usuario { id: string; usuario: string; nombre: string; rol: Rol; activo: boolean }

interface Categoria { id: string; nombre: string }           // Celulares, Tablets, …
interface Marca     { id: string; categoriaId: string; nombre: string }
interface Financiera{ id: string; nombre: string }

interface Tasa {
  id: string;
  categoriaId: string;
  marcaId: string;
  financieraId: string;
  tipo: TipoTasa;
  tasa: number;          // porcentaje, p. ej. 2.1
  plazos: number[];      // meses permitidos, p. ej. [6, 12, 18, 24]
  inicialMin: number;    // % de cuota inicial mínima, 0 si no aplica
  activa: boolean;       // solo las activas aparecen en la calculadora
  actualizadoEn: string; // ISO
  actualizadoPor: string;
}
```

Unicidad: una `Tasa` por (`categoriaId`, `marcaId`, `financieraId`).

## Fórmula de la cuota (idéntica en ambas pantallas)

```ts
const mensual = tipo === 'mensual' ? tasa / 100 : Math.pow(1 + tasa / 100, 1 / 12) - 1;
const financia = precio * (1 - inicial / 100);
const cuota = financia * mensual / (1 - Math.pow(1 + mensual, -plazo));   // amortización francesa
const total = cuota * plazo + precio * inicial / 100;
const intereses = cuota * plazo - financia;
```

Formato de dinero: `$ 1.899.900` (espacio tras el signo, punto de miles, sin decimales). Porcentajes con coma: `2,1 %`.

## Cómo usar el sistema de diseño en el código

- `design-system/tokens.json` es la fuente; `tokens.css` es su compilación (`:root` + `[data-theme="dark"]`, clases por estilo de texto). Importa `tokens.css` tal cual o regenera el CSS desde el JSON.
- `design-system/README.md` son las reglas: idioma (es-CO, tú, sentence case), un solo acento, estados como Badge con palabra, radios, sombras, fuente de marca.
- `design-system/components/bundle.js` + `bundle.css` son los 10 componentes de referencia en React.createElement (sin JSX ni build). Puedes montarlos tal cual (`window.Esgode.Button`) o portarlos a TSX conservando clases, props y tokens — `index.d.ts` documenta las props.
- Fuentes: UI en la fuente del sistema (SF/Helvetica stack, sin webfont). Marca en Quicksand 700 desde Google Fonts, solo para el wordmark y el tagline.
- Logo en `design-system/assets/logos/` (ver su README para cuál usar en cada fondo). El lockup "es·ode" con la marca como g está implementado en `Main.dc.html`.

## Lo que NO está decidido todavía

- Backend/auth: ninguno. Las pantallas usan datos en memoria.
- Financieras reales y sus reglas (comisiones, seguros, tasa plana): hoy son placeholders (Crédito Fácil, PagoFlex, FinanCasanare).
- "Nueva tasa" (sheet), "Usuarios y roles", y el resto del CRM (`design-system/screens.md` describe las pantallas previstas).
- Logo en SVG o alta resolución (el actual es 114 px).

## Prompt sugerido para Claude Code

> Lee `HANDOFF.md`, luego `design-system/README.md`, `design-system/tokens.json` y las tres pantallas en `design/screens/`. Crea un proyecto Next.js (App Router) + TypeScript con Tailwind configurado a partir de `tokens.json` (colores por tema con `data-theme`, radios, espaciado, tipografía). Porta los componentes de `design-system/components/bundle.js` a TSX manteniendo nombres de clase y props. Implementa las rutas `/login`, `/calculadora` (móvil, rol staff) y `/admin/tasas` (escritorio, rol admin) replicando los artboards; usa el modelo de datos y la fórmula del handoff con un store en memoria por ahora. Respeta dark mode vía `data-theme`.
