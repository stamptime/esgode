import type { Contrato, ContratoNuevo } from "@/lib/types";

// Contratos de ejemplo para las pruebas.

export function nuevo(parche: Partial<ContratoNuevo> = {}): ContratoNuevo {
  return {
    tipo: "acuerdo",
    acreedor: "esmer",
    forma: "cuotas",
    conIntereses: false,
    cliente: {
      trato: "sra",
      nombre: "Laura Camila Pérez Ríos",
      cc: "1.118.000.111",
      exp: "Yopal",
      ciudad: "Yopal",
      dir: "Calle 10 # 20-30, barrio Centro",
      correo: "laura@correo.com",
      cel: "300 123 4567",
    },
    equipo: {
      categoria: "celular",
      marca: "Apple",
      modelo: "iPhone 15",
      color: "Negro",
      capacidad: "128 GB",
      estado: "nuevo",
      serial: "F2LXK9ABCD12",
      imeis: ["351234567890123"],
    },
    precio: 4_200_000,
    inicial: 600_000,
    capital: 3_600_000,
    nCuotas: 6,
    periodo: "mensual",
    fechaPago: "2099-11-05",
    tasa: 0,
    mesTasa: "octubre",
    intereses: null,
    diasDevolucion: 30,
    ...parche,
  };
}

export function contrato(parche: Partial<Contrato> = {}): Contrato {
  return {
    ...nuevo(),
    id: "c1",
    etapa: "aprobado",
    paso: 4,
    anio: 2026,
    numero: 14,
    aprobadoEn: "2026-10-24T15:00:00.000Z",
    aprobadoPor: "Administración",
    firma: "pendiente",
    firmaTrazo: null,
    firmaLienzo: "800 260",
    firmadoEn: null,
    firmaDispositivo: null,
    verificacion: null,
    pagos: [],
    copias: {},
    fotos: {},
    anulado: false,
    motivoAnulacion: null,
    creadoEn: "2026-10-24T14:00:00.000Z",
    creadoPor: "Camila Rojas",
    editadoEn: "2026-10-24T14:30:00.000Z",
    editadoPor: "Camila Rojas",
    ...parche,
  };
}

/** Texto plano de los bloques del documento, para buscar frases. */
export const textoDe = (bloques: { tipo: string; segs?: { t: string }[]; lineas?: string[]; texto?: string }[]) =>
  bloques.map((b) => (b.segs ? b.segs.map((s) => s.t).join("") : (b.lineas?.join(" ") ?? b.texto ?? ""))).join("\n");
