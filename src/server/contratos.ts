"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { COPIAS, cobrosDe, erroresContrato } from "@/lib/contratos";
import type { ClienteContrato, Contrato, ContratoNuevo, Copia, EquipoContrato, Usuario } from "@/lib/types";
import { sql } from "./db";
import { usuarioActual } from "./sesion";

// Acciones del módulo de contratos. El staff crea, firma y descarga; el
// registro, los pagos y la anulación son de administración.

export type RespuestaContrato =
  { ok: true; contrato: Contrato } | { ok: false; error: string; sinSesion?: boolean };
export type RespuestaContratos =
  { ok: true; contratos: Contrato[] } | { ok: false; error: string; sinSesion?: boolean };

const SIN_SESION = { ok: false, error: "Tu sesión terminó. Vuelve a ingresar.", sinSesion: true } as const;
const NO_EXISTE = "Ese contrato ya no existe. Vuelve al registro.";

class Invalido extends Error {}

// Lista fija de columnas (sin datos del usuario).
const COLUMNAS = sql.unsafe(`
  id, tipo, anio, numero, forma, con_intereses as "conIntereses", cliente, equipo,
  capital::float8 as capital, n_cuotas as "nCuotas", coalesce(fecha_pago::text, '') as "fechaPago",
  tasa::float8 as tasa, mes_tasa as "mesTasa", intereses::float8 as intereses,
  dias_devolucion as "diasDevolucion", firma, firma_trazo as "firmaTrazo", firmado_en as "firmadoEn",
  firma_dispositivo as "firmaDispositivo", verificacion, pagos, copias, anulado,
  creado_en as "creadoEn", creado_por as "creadoPor"`);

type Fila = Omit<Contrato, "firmadoEn" | "creadoEn"> & { firmadoEn: Date | string | null; creadoEn: Date | string };

function aContrato(f: Fila): Contrato {
  return {
    ...f,
    firmadoEn: f.firmadoEn ? new Date(f.firmadoEn).toISOString() : null,
    creadoEn: new Date(f.creadoEn).toISOString(),
  };
}

async function leer(id: string): Promise<Contrato | null> {
  const filas = await sql`select ${COLUMNAS} from contratos where id = ${String(id)}`;
  return filas[0] ? aContrato(filas[0] as Fila) : null;
}

/** Corre la acción con sesión (y rol, si se pide) y traduce los errores a mensajes. */
async function conSesion<T extends object>(
  soloAdmin: boolean,
  tarea: (u: Usuario) => Promise<T>,
): Promise<({ ok: true } & T) | { ok: false; error: string; sinSesion?: boolean }> {
  const usuario = await usuarioActual();
  if (!usuario) return SIN_SESION;
  if (soloAdmin && usuario.rol !== "admin")
    return { ok: false, error: "Solo administración puede hacer esto." };
  try {
    return { ok: true, ...(await tarea(usuario)) };
  } catch (e) {
    if (e instanceof Invalido) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "No se pudo guardar. Revisa tu conexión y vuelve a intentar." };
  }
}

async function devolver(id: string) {
  const contrato = await leer(id);
  if (!contrato) throw new Invalido(NO_EXISTE);
  return { contrato };
}

/* ---------- Lectura ---------- */

export async function obtenerContrato(id: string): Promise<RespuestaContrato> {
  return conSesion(false, () => devolver(id));
}

export async function listarContratos(): Promise<RespuestaContratos> {
  return conSesion(true, async () => {
    const filas = await sql`select ${COLUMNAS} from contratos order by creado_en desc`;
    return { contratos: filas.map((f) => aContrato(f as Fila)) };
  });
}

/** El consecutivo que tendría el próximo contrato de cada tipo este año. */
export async function proximosNumeros(): Promise<{ acuerdo: number; compraventa: number; anio: number } | null> {
  if (!(await usuarioActual())) return null;
  const anio = new Date().getFullYear();
  const filas = await sql`
    select tipo, max(numero)::int as n from contratos where anio = ${anio} group by tipo`;
  const de = (t: string) => ((filas.find((f) => f.tipo === t)?.n as number | undefined) ?? 0) + 1;
  return { acuerdo: de("acuerdo"), compraventa: de("compraventa"), anio };
}

/** Clientes de contratos anteriores, el más reciente por cédula, para no volver a escribirlos. */
export async function clientesAnteriores(): Promise<ClienteContrato[]> {
  if (!(await usuarioActual())) return [];
  const filas = await sql`
    select distinct on (cliente->>'cc') cliente from contratos
    order by cliente->>'cc', creado_en desc limit 1000`;
  return filas.map((f) => f.cliente as ClienteContrato);
}

/* ---------- Escritura ---------- */

const texto = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);

function limpiar(d: ContratoNuevo): ContratoNuevo {
  const c = d.cliente ?? ({} as ClienteContrato);
  const q = d.equipo ?? ({} as EquipoContrato);
  const compra = d.tipo === "compraventa";
  const limpio: ContratoNuevo = {
    tipo: compra ? "compraventa" : "acuerdo",
    forma: !compra && d.forma === "unico" ? "unico" : "cuotas",
    conIntereses: !compra && d.conIntereses === true,
    cliente: {
      trato: c.trato === "sr" ? "sr" : "sra",
      nombre: texto(c.nombre, 120),
      cc: texto(c.cc, 20),
      exp: texto(c.exp, 60),
      ciudad: texto(c.ciudad, 60),
      dir: texto(c.dir),
      correo: texto(c.correo, 120),
      cel: texto(c.cel, 20),
    },
    equipo: {
      categoria: (["celular", "tablet", "portatil", "otro"] as const).find((x) => x === q.categoria) ?? "otro",
      marca: texto(q.marca, 60),
      modelo: texto(q.modelo, 80),
      color: texto(q.color, 40),
      capacidad: texto(q.capacidad, 60),
      estado: (["nuevo", "seminuevo", "usado"] as const).find((x) => x === q.estado) ?? "nuevo",
      serial: texto(q.serial, 60),
    },
    capital: Number(d.capital),
    nCuotas: compra ? 1 : d.forma === "unico" ? 1 : Number(d.nCuotas),
    fechaPago: compra ? "" : texto(d.fechaPago, 10),
    mesTasa: texto(d.mesTasa, 20),
    intereses: !compra && d.forma === "unico" && d.conIntereses && d.intereses != null ? Number(d.intereses) : null,
    diasDevolucion: compra ? Number(d.diasDevolucion) : null,
  };
  const errores = Object.values(erroresContrato(limpio));
  if (errores.length) throw new Invalido(errores[0]);
  return limpio;
}

export async function crearContrato(datos: ContratoNuevo): Promise<RespuestaContrato> {
  return conSesion(false, async (u) => {
    const d = limpiar(datos);
    const [ajustes] = await sql`select tasa_contratos::float8 as tasa from ajustes where id = 1`;
    const tasa = d.conIntereses ? ((ajustes?.tasa as number | undefined) ?? 1.9) : 0;
    const anio = new Date().getFullYear();
    const id = randomUUID();
    // El consecutivo es el siguiente del tipo y el año; si dos asesores generan a la vez, se reintenta.
    for (let intento = 0; ; intento++) {
      try {
        await sql`
          insert into contratos (id, tipo, anio, numero, forma, con_intereses, cliente, equipo, capital, n_cuotas,
            fecha_pago, tasa, mes_tasa, intereses, dias_devolucion, creado_por)
          select ${id}, ${d.tipo}, ${anio}, coalesce(max(numero), 0) + 1, ${d.forma}, ${d.conIntereses},
            ${JSON.stringify(d.cliente)}::jsonb, ${JSON.stringify(d.equipo)}::jsonb, ${d.capital}, ${d.nCuotas},
            ${d.fechaPago || null}::date, ${tasa}, ${d.mesTasa}, ${d.intereses}, ${d.diasDevolucion}, ${u.nombre}
          from contratos where tipo = ${d.tipo} and anio = ${anio}`;
        break;
      } catch (e) {
        if ((e as { code?: string }).code !== "23505" || intento >= 2) throw e;
      }
    }
    return devolver(id);
  });
}

/** "iPhone", "Android", "Computador": lo que se guarda como dispositivo de la firma. */
function dispositivo(agente: string): string {
  if (/iPhone/i.test(agente)) return "iPhone";
  if (/iPad/i.test(agente)) return "iPad";
  if (/Android/i.test(agente)) return /Mobile/i.test(agente) ? "Celular Android" : "Tablet Android";
  return "Computador";
}

export async function firmarContrato(id: string, trazo: string): Promise<RespuestaContrato> {
  return conSesion(false, async () => {
    const t = String(trazo ?? "");
    if (!/^[ML0-9 .-]+$/.test(t) || t.length < 10 || t.length > 40_000)
      throw new Invalido("Firma en el recuadro y vuelve a intentar.");
    const agente = (await headers()).get("user-agent") ?? "";
    const v = randomBytes(6).toString("hex").toUpperCase().match(/.{4}/g)!.join("-");
    const filas = await sql`
      update contratos set firma = 'digital', firma_trazo = ${t}, firmado_en = now(),
        firma_dispositivo = ${dispositivo(agente)}, verificacion = ${v}
      where id = ${String(id)} and firma = 'pendiente' and not anulado returning id`;
    if (!filas.length) {
      const c = await leer(id);
      if (!c) throw new Invalido(NO_EXISTE);
      throw new Invalido(c.anulado ? "Este contrato fue anulado." : "Este contrato ya está firmado.");
    }
    return devolver(id);
  });
}

export async function marcarFirmadoEnPapel(id: string): Promise<RespuestaContrato> {
  return conSesion(false, async () => {
    await sql`
      update contratos set firma = 'papel', firmado_en = now()
      where id = ${String(id)} and firma = 'pendiente' and not anulado`;
    return devolver(id);
  });
}

/** Deja en el historial quién descargó cada copia y cuándo. */
export async function registrarDescarga(id: string, copias: Copia[]): Promise<RespuestaContrato> {
  return conSesion(false, async (u) => {
    const validas = COPIAS.filter((c) => (copias ?? []).includes(c));
    const registro = { en: new Date().toISOString(), por: u.nombre };
    const parche = Object.fromEntries(validas.map((c) => [c, registro]));
    await sql`update contratos set copias = copias || ${JSON.stringify(parche)}::jsonb where id = ${String(id)}`;
    return devolver(id);
  });
}

export async function registrarPago(id: string): Promise<RespuestaContrato> {
  return conSesion(true, async (u) => {
    const c = await leer(id);
    if (!c) throw new Invalido(NO_EXISTE);
    if (c.anulado || c.firma === "pendiente" || c.tipo === "compraventa")
      throw new Invalido("Solo se registran pagos de acuerdos firmados.");
    if (c.pagos.length >= cobrosDe(c).length) throw new Invalido("Este acuerdo ya está pagado.");
    const registro = { en: new Date().toISOString(), por: u.nombre };
    // La condición sobre el número de pagos evita registrar dos veces la misma cuota.
    await sql`
      update contratos set pagos = pagos || ${JSON.stringify([registro])}::jsonb
      where id = ${c.id} and jsonb_array_length(pagos) = ${c.pagos.length}`;
    return devolver(id);
  });
}

export async function anularContrato(id: string): Promise<RespuestaContrato> {
  return conSesion(true, async () => {
    await sql`update contratos set anulado = true where id = ${String(id)}`;
    return devolver(id);
  });
}
