import type { Categoria, Financiera, Marca, Producto, Tasa, TipoTasa } from "./types";

// Datos de ejemplo que `scripts/db.mjs setup` carga en una base de datos vacía;
// después el admin los configura desde el escritorio. Financieras, productos y precios son placeholders.

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

export const PRODUCTOS: Producto[] = [
  {
    id: "p-a55",
    categoriaId: "cel",
    marcaId: "cel-samsung",
    nombre: "Galaxy A55 256 GB",
    precio: 1899900,
    activo: true,
  },
  { id: "p-ip15", categoriaId: "cel", marcaId: "cel-apple", nombre: "iPhone 15 128 GB", precio: 3499900, activo: true },
  {
    id: "p-rn13",
    categoriaId: "cel",
    marcaId: "cel-xiaomi",
    nombre: "Redmi Note 13 256 GB",
    precio: 899900,
    activo: true,
  },
  {
    id: "p-tab-s9fe",
    categoriaId: "tab",
    marcaId: "tab-samsung",
    nombre: "Galaxy Tab S9 FE",
    precio: 1799900,
    activo: true,
  },
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
