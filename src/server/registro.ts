import "server-only";
import type { Contrato } from "@/lib/types";
import { sql } from "./db";

// Lectura de contratos compartida por las acciones y las rutas de fotos.

// Lista fija de columnas (sin datos del usuario).
export const COLUMNAS = sql.unsafe(`
  id, tipo, acreedor, anio, numero, forma, con_intereses as "conIntereses", cliente, equipo,
  precio::float8 as precio, inicial::float8 as inicial, capital::float8 as capital, n_cuotas as "nCuotas",
  periodo, coalesce(fecha_pago::text, '') as "fechaPago", tasa::float8 as tasa, mes_tasa as "mesTasa",
  intereses::float8 as intereses, dias_devolucion as "diasDevolucion", paso,
  case when aprobado_en is null then 'borrador' when firma = 'pendiente' then 'aprobado' else 'firmado' end as etapa,
  aprobado_en as "aprobadoEn", aprobado_por as "aprobadoPor", firma, firma_trazo as "firmaTrazo",
  firma_lienzo as "firmaLienzo", firmado_en as "firmadoEn", firma_dispositivo as "firmaDispositivo",
  verificacion, pagos, copias, fotos, anulado, motivo_anulacion as "motivoAnulacion",
  creado_en as "creadoEn", creado_por as "creadoPor", editado_en as "editadoEn", editado_por as "editadoPor"`);

type Fecha = Date | string;
export type Fila = Omit<Contrato, "firmadoEn" | "creadoEn" | "aprobadoEn" | "editadoEn"> & {
  firmadoEn: Fecha | null;
  aprobadoEn: Fecha | null;
  creadoEn: Fecha;
  editadoEn: Fecha;
};

const iso = (f: Fecha | null) => (f ? new Date(f).toISOString() : null);

export function aContrato(f: Fila): Contrato {
  return {
    ...f,
    equipo: { ...f.equipo, imeis: f.equipo.imeis ?? [] },
    firmadoEn: iso(f.firmadoEn),
    aprobadoEn: iso(f.aprobadoEn),
    creadoEn: iso(f.creadoEn)!,
    editadoEn: iso(f.editadoEn)!,
  };
}

export async function leerContrato(id: string): Promise<Contrato | null> {
  const filas = await sql`select ${COLUMNAS} from contratos where id = ${String(id)}`;
  return filas[0] ? aContrato(filas[0] as Fila) : null;
}
