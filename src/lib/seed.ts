import type { Categoria, Financiera, Marca, Tasa, TipoTasa, Usuario } from "./types";

// Datos de ejemplo de los artboards. Las financieras son placeholders hasta
// que se definan las reales y sus reglas.

export const CATEGORIAS: Categoria[] = [
  { id: "cel", nombre: "Celulares" },
  { id: "tab", nombre: "Tablets" },
];

export const MARCAS: Marca[] = [
  { id: "cel-samsung", categoriaId: "cel", nombre: "Samsung" },
  { id: "cel-apple", categoriaId: "cel", nombre: "Apple" },
  { id: "cel-xiaomi", categoriaId: "cel", nombre: "Xiaomi" },
  { id: "cel-moto", categoriaId: "cel", nombre: "Motorola" },
  { id: "tab-samsung", categoriaId: "tab", nombre: "Samsung" },
  { id: "tab-apple", categoriaId: "tab", nombre: "Apple" },
  { id: "tab-lenovo", categoriaId: "tab", nombre: "Lenovo" },
];

export const FINANCIERAS: Financiera[] = [
  { id: "cf", nombre: "Crédito Fácil" },
  { id: "pf", nombre: "PagoFlex" },
  { id: "fc", nombre: "FinanCasanare" },
];

// Sin backend todavía: la verificación ocurre en el cliente. Se guarda el
// SHA-256 de "usuario:contraseña", no la contraseña; aun así no es seguridad real.
export const USUARIOS: (Usuario & { hash: string })[] = [
  { id: "u-esmer", usuario: "esmer.gomez", nombre: "Esmer Gómez", rol: "admin", activo: true, hash: "9dbfc5de8175cbfac61c9d360c9d433788556aacfccd6ab0879c1c85b208d1d4" },
  { id: "u-demo", usuario: "demo", nombre: "Usuario Demo", rol: "staff", activo: true, hash: "07f9fd18bcdc7fd3ce318d4abb7045916fecc2cedbc27f3145c53e630a47e27b" },
];

const SEMILLA_EN = "2026-10-10T08:14:00-05:00";
const SEMILLA_POR = "Esmer Gómez";

function tasa(
  marcaId: string,
  financieraId: string,
  valor: number,
  plazos: number[],
  inicialMin: number,
  activa = true,
  tipo: TipoTasa = "mensual",
): Tasa {
  return {
    id: `${marcaId}-${financieraId}`,
    categoriaId: marcaId.split("-")[0],
    marcaId,
    financieraId,
    tipo,
    tasa: valor,
    plazos,
    inicialMin,
    activa,
    actualizadoEn: SEMILLA_EN,
    actualizadoPor: SEMILLA_POR,
  };
}

export const TASAS_SEMILLA: Tasa[] = [
  tasa("cel-samsung", "cf", 2.1, [6, 12, 18, 24], 10),
  tasa("cel-samsung", "pf", 1.8, [12, 24, 36], 20),
  tasa("cel-samsung", "fc", 2.4, [6, 12], 0),
  tasa("cel-apple", "cf", 1.9, [12, 18, 24], 20),
  tasa("cel-apple", "pf", 1.7, [12, 24, 36], 30),
  tasa("cel-xiaomi", "cf", 2.3, [6, 12, 18], 10),
  tasa("cel-xiaomi", "fc", 2.6, [6, 12], 0),
  tasa("cel-moto", "fc", 2.5, [6, 12], 0, false),
  tasa("tab-samsung", "cf", 2.0, [6, 12, 18, 24], 10),
  tasa("tab-samsung", "pf", 1.8, [12, 24], 20),
  tasa("tab-apple", "cf", 1.9, [12, 18, 24], 20),
  tasa("tab-lenovo", "fc", 2.4, [6, 12], 0),
];

export const nombreDe = (lista: { id: string; nombre: string }[], id: string) =>
  lista.find((x) => x.id === id)?.nombre ?? "";
