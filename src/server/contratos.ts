"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { COPIAS, cobrosDe, erroresContrato, limpiarContrato } from "@/lib/contratos";
import type { ClienteContrato, Contrato, ContratoNuevo, Copia, FotoCedula, FotoEquipo, Usuario } from "@/lib/types";
import { sql } from "./db";
import { borrarFotos } from "./fotos";
import { COLUMNAS, aContrato, leerContrato, type Fila } from "./registro";
import { usuarioActual } from "./sesion";

// Acciones del módulo de contratos. El staff llena el borrador, lo envía a
// revisión, firma y descarga; aprobar, registrar pagos y anular son de
// administración. Un contrato pasa por borrador → aprobado → firmado.

export type RespuestaContrato = { ok: true; contrato: Contrato } | { ok: false; error: string; sinSesion?: boolean };
export type RespuestaContratos =
  { ok: true; contratos: Contrato[] } | { ok: false; error: string; sinSesion?: boolean };
export type RespuestaSimple = { ok: true } | { ok: false; error: string; sinSesion?: boolean };

const SIN_SESION = { ok: false, error: "Tu sesión terminó. Vuelve a ingresar.", sinSesion: true } as const;
const NO_EXISTE = "Ese contrato ya no existe. Vuelve al registro.";

class Invalido extends Error {}

/** Corre la acción con sesión (y rol, si se pide) y traduce los errores a mensajes. */
async function conSesion<T extends object>(
  soloAdmin: boolean,
  tarea: (u: Usuario) => Promise<T>,
): Promise<({ ok: true } & T) | { ok: false; error: string; sinSesion?: boolean }> {
  const usuario = await usuarioActual();
  if (!usuario) return SIN_SESION;
  if (soloAdmin && usuario.rol !== "admin") return { ok: false, error: "Solo administración puede hacer esto." };
  try {
    return { ok: true, ...(await tarea(usuario)) };
  } catch (e) {
    if (e instanceof Invalido) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "No se pudo guardar. Revisa tu conexión y vuelve a intentar." };
  }
}

async function devolver(id: string) {
  const contrato = await leerContrato(id);
  if (!contrato) throw new Invalido(NO_EXISTE);
  return { contrato };
}

/** El contrato, si existe y no está anulado; si no, un error que explica por qué. */
async function vigente(id: string): Promise<Contrato> {
  const c = await leerContrato(id);
  if (!c) throw new Invalido(NO_EXISTE);
  if (c.anulado) throw new Invalido("Este contrato fue anulado.");
  return c;
}

/** Si la condición del update no se cumplió, explica el estado actual del contrato. */
async function explicar(id: string): Promise<never> {
  const c = await vigente(id);
  if (c.etapa === "firmado") throw new Invalido("Este contrato ya está firmado y no se puede modificar.");
  if (c.etapa === "aprobado")
    throw new Invalido("Este contrato ya está aprobado. Vuélvelo a borrador para corregirlo.");
  throw new Invalido("Este contrato aún es un borrador. Primero hay que aprobarlo.");
}

/* ---------- Lectura ---------- */

export async function obtenerContrato(id: string): Promise<RespuestaContrato> {
  return conSesion(false, () => devolver(id));
}

/** Administración ve todo el registro; el staff, los borradores, los que están por firmar y los firmados de las últimas dos semanas. */
export async function listarContratos(): Promise<RespuestaContratos> {
  return conSesion(false, async (u) => {
    const filas =
      u.rol === "admin"
        ? await sql`select ${COLUMNAS} from contratos order by editado_en desc`
        : await sql`select ${COLUMNAS} from contratos
            where not anulado and (firma = 'pendiente' or firmado_en > now() - interval '14 days')
            order by editado_en desc`;
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
    where coalesce(cliente->>'cc', '') <> '' and not anulado
    order by cliente->>'cc', creado_en desc limit 1000`;
  return filas.map((f) => f.cliente as ClienteContrato);
}

/* ---------- Borrador ---------- */

const texto = (v: unknown, max = 160) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

/** Crea el borrador (sin id) o guarda los cambios. Solo se modifica mientras sea borrador. */
export async function guardarBorrador(
  id: string | null,
  datos: ContratoNuevo,
  paso: number,
): Promise<RespuestaContrato> {
  return conSesion(false, async (u) => {
    const d = limpiarContrato(datos);
    const p = Math.min(Math.max(Math.round(Number(paso)) || 1, 1), 4);
    const comunes = [
      d.tipo,
      d.acreedor,
      d.forma,
      d.conIntereses,
      JSON.stringify(d.cliente),
      JSON.stringify(d.equipo),
      d.precio,
      d.inicial,
      d.capital,
      d.nCuotas,
      d.periodo,
      d.fechaPago || null,
      d.tasa,
      d.mesTasa,
      d.intereses,
      d.diasDevolucion,
      p,
    ] as const;
    if (!id) {
      const nuevo = randomUUID();
      await sql`
        insert into contratos (id, tipo, acreedor, forma, con_intereses, cliente, equipo, precio, inicial, capital, n_cuotas,
          periodo, fecha_pago, tasa, mes_tasa, intereses, dias_devolucion, paso, creado_por, creado_por_id, editado_por)
        values (${nuevo}, ${comunes[0]}, ${comunes[1]}, ${comunes[2]}, ${comunes[3]}, ${comunes[4]}::jsonb, ${comunes[5]}::jsonb,
          ${comunes[6]}, ${comunes[7]}, ${comunes[8]}, ${comunes[9]}, ${comunes[10]}, ${comunes[11]}::date, ${comunes[12]},
          ${comunes[13]}, ${comunes[14]}, ${comunes[15]}, ${comunes[16]}, ${u.nombre}, ${u.id}, ${u.nombre})`;
      return devolver(nuevo);
    }
    const filas = await sql`
      update contratos set tipo = ${comunes[0]}, acreedor = ${comunes[1]}, forma = ${comunes[2]}, con_intereses = ${comunes[3]},
        cliente = ${comunes[4]}::jsonb, equipo = ${comunes[5]}::jsonb, precio = ${comunes[6]}, inicial = ${comunes[7]},
        capital = ${comunes[8]}, n_cuotas = ${comunes[9]}, periodo = ${comunes[10]}, fecha_pago = ${comunes[11]}::date,
        tasa = ${comunes[12]}, mes_tasa = ${comunes[13]}, intereses = ${comunes[14]}, dias_devolucion = ${comunes[15]},
        paso = ${comunes[16]}, editado_en = now(), editado_por = ${u.nombre}
      where id = ${String(id)} and aprobado_en is null and not anulado returning id`;
    if (!filas.length) await explicar(id);
    return devolver(id);
  });
}

/** Solo se elimina un borrador que nunca tuvo número; los numerados se anulan. */
export async function eliminarBorrador(id: string): Promise<RespuestaSimple> {
  return conSesion(false, async () => {
    const c = await vigente(id);
    if (c.etapa !== "borrador") await explicar(id);
    if (c.numero != null)
      throw new Invalido("Este borrador ya tuvo número. Para descartarlo, anúlalo desde el registro.");
    await sql`delete from contratos where id = ${c.id} and aprobado_en is null and numero is null`;
    await borrarFotos(c.id);
    return {};
  });
}

/* ---------- Aprobación ---------- */

async function usuraVigente(): Promise<number | null> {
  const [a] = await sql`select usura::float8 as usura from ajustes where id = 1`;
  return (a?.usura as number | null | undefined) ?? null;
}

/** Administración aprueba: se valida todo, se asigna el número (la primera vez) y el contenido queda bloqueado. */
export async function aprobarContrato(id: string): Promise<RespuestaContrato> {
  return conSesion(true, async (u) => {
    const c = await vigente(id);
    if (c.etapa !== "borrador") await explicar(id);
    const errores = Object.values(erroresContrato(c, undefined, await usuraVigente()));
    if (errores.length) throw new Invalido(`Falta corregir el borrador: ${errores[0]}`);
    const anio = c.anio ?? new Date().getFullYear();
    // Al volver a borrador se conserva el número; si no tiene, es el siguiente del tipo y el año.
    for (let intento = 0; ; intento++) {
      try {
        const filas = await sql`
          update contratos set aprobado_en = now(), aprobado_por = ${u.nombre}, anio = ${anio},
            numero = coalesce(numero, (select coalesce(max(numero), 0) + 1 from contratos where tipo = ${c.tipo} and anio = ${anio}))
          where id = ${c.id} and aprobado_en is null and not anulado returning id`;
        if (!filas.length) await explicar(id);
        break;
      } catch (e) {
        if ((e as { code?: string }).code !== "23505" || intento >= 2) throw e;
      }
    }
    return devolver(id);
  });
}

/** Para corregir un contrato aprobado sin firmar: pierde la aprobación (conserva el número). */
export async function volverABorrador(id: string): Promise<RespuestaContrato> {
  return conSesion(false, async (u) => {
    const filas = await sql`
      update contratos set aprobado_en = null, aprobado_por = null, copias = '{}', editado_en = now(), editado_por = ${u.nombre}
      where id = ${String(id)} and aprobado_en is not null and firma = 'pendiente' and not anulado returning id`;
    if (!filas.length) {
      const c = await vigente(id);
      if (c.etapa === "borrador") throw new Invalido("Este contrato ya es un borrador.");
      await explicar(id);
    }
    return devolver(id);
  });
}

/* ---------- Firma ---------- */

/** "iPhone", "Android", "Computador": lo que se guarda como dispositivo de la firma. */
function dispositivo(agente: string): string {
  if (/iPhone/i.test(agente)) return "iPhone";
  if (/iPad/i.test(agente)) return "iPad";
  if (/Android/i.test(agente)) return /Mobile/i.test(agente) ? "Celular Android" : "Tablet Android";
  return "Computador";
}

export async function firmarContrato(id: string, trazo: string, lienzo = "800 260"): Promise<RespuestaContrato> {
  return conSesion(false, async () => {
    const t = String(trazo ?? "");
    if (!/^[ML0-9 .-]+$/.test(t) || t.length < 10 || t.length > 60_000)
      throw new Invalido("Firma en el recuadro y vuelve a intentar.");
    const l = /^\d{2,4} \d{2,4}$/.test(String(lienzo)) ? String(lienzo) : "800 260";
    const agente = (await headers()).get("user-agent") ?? "";
    const v = randomBytes(6).toString("hex").toUpperCase().match(/.{4}/g)!.join("-");
    const filas = await sql`
      update contratos set firma = 'digital', firma_trazo = ${t}, firma_lienzo = ${l}, firmado_en = now(),
        firma_dispositivo = ${dispositivo(agente)}, verificacion = ${v}
      where id = ${String(id)} and aprobado_en is not null and firma = 'pendiente' and not anulado returning id`;
    if (!filas.length) await explicar(id);
    return devolver(id);
  });
}

/** Deja en el historial quién descargó cada copia y cuándo (el PDF del borrador no cuenta). */
export async function registrarDescarga(id: string, copias: Copia[]): Promise<RespuestaContrato> {
  return conSesion(false, async (u) => {
    const validas = COPIAS.filter((c) => (copias ?? []).includes(c));
    const registro = { en: new Date().toISOString(), por: u.nombre };
    const parche = Object.fromEntries(validas.map((c) => [c, registro]));
    await sql`update contratos set copias = copias || ${JSON.stringify(parche)}::jsonb
      where id = ${String(id)} and aprobado_en is not null`;
    return devolver(id);
  });
}

/* ---------- Administración ---------- */

export async function registrarPago(id: string): Promise<RespuestaContrato> {
  return conSesion(true, async (u) => {
    const c = await vigente(id);
    if (c.etapa !== "firmado" || c.tipo === "compraventa")
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

/** Un contrato con número no se borra: se anula con un motivo y queda en el historial. */
export async function anularContrato(id: string, motivo: string): Promise<RespuestaContrato> {
  return conSesion(true, async (u) => {
    const m = texto(motivo, 300);
    if (m.length < 5) throw new Invalido("Escribe el motivo de la anulación.");
    const c = await vigente(id);
    if (c.numero == null) throw new Invalido("Un borrador sin número no se anula: elimínalo.");
    await sql`update contratos set anulado = true, motivo_anulacion = ${m}, editado_en = now(), editado_por = ${u.nombre}
      where id = ${c.id}`;
    return devolver(id);
  });
}

/** Quita una foto del borrador. Las de entrega se pueden quitar hasta que se firma. */
export async function quitarFoto(
  id: string,
  hueco: FotoCedula | FotoEquipo | "entrega",
  indice = 0,
): Promise<RespuestaContrato> {
  return conSesion(false, async () => {
    const c = await vigente(id);
    if (hueco === "entrega") {
      if (c.etapa === "firmado") throw new Invalido("Las evidencias de un contrato firmado ya no se quitan.");
      const lista = c.fotos.entregas ?? [];
      if (!lista[indice]) return devolver(id);
      const siguiente = lista.filter((_, i) => i !== indice);
      await sql`update contratos set fotos = fotos || ${JSON.stringify({ entregas: siguiente })}::jsonb where id = ${c.id}`;
      await borrarFotos(c.id, [lista[indice].archivo]);
      return devolver(id);
    }
    if (!["cedulaFrente", "cedulaReverso", "frente", "reverso", "pantalla", "detalle"].includes(hueco))
      throw new Invalido("Esa foto no existe.");
    if (c.etapa !== "borrador") await explicar(id);
    const foto = c.fotos[hueco];
    if (!foto) return devolver(id);
    await sql`update contratos set fotos = fotos - ${hueco}::text where id = ${c.id} and aprobado_en is null`;
    await borrarFotos(c.id, [foto.archivo]);
    return devolver(id);
  });
}
