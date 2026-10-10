import type { TipoTasa } from "./types";

/** Tasa mensual como fracción (0.021), a partir de una tasa mensual o efectiva anual en %. */
export function tasaMensual(tipo: TipoTasa, tasa: number): number {
  return tipo === "mensual" ? tasa / 100 : Math.pow(1 + tasa / 100, 1 / 12) - 1;
}

/** Tasa efectiva anual como fracción. */
export function tasaEfectivaAnual(tipo: TipoTasa, tasa: number): number {
  return tipo === "ea" ? tasa / 100 : Math.pow(1 + tasa / 100, 12) - 1;
}

export interface Cotizacion {
  mensual: number;
  inicialValor: number;
  financia: number;
  cuota: number;
  total: number;
  intereses: number;
}

/** Amortización francesa. `inicial` es el % de cuota inicial; `plazo`, en meses. */
export function cotizar(p: {
  precio: number;
  inicial: number;
  plazo: number;
  tipo: TipoTasa;
  tasa: number;
}): Cotizacion {
  const mensual = tasaMensual(p.tipo, p.tasa);
  const inicialValor = (p.precio * p.inicial) / 100;
  const financia = p.precio * (1 - p.inicial / 100);
  let cuota = 0;
  if (financia > 0 && p.plazo > 0) {
    cuota =
      mensual > 0
        ? (financia * mensual) / (1 - Math.pow(1 + mensual, -p.plazo))
        : financia / p.plazo;
  }
  return {
    mensual,
    inicialValor,
    financia,
    cuota,
    total: cuota * p.plazo + inicialValor,
    intereses: cuota * p.plazo - financia,
  };
}
