import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Usuario } from "@/lib/types";
import { sql } from "./db";

// Sesión en una cookie httpOnly firmada con HMAC: "<usuarioId>.<vence>.<firma>".

const COOKIE = "esgode_sesion";
const DIA = 24 * 60 * 60;

function firma(texto: string): string {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error("Falta SESSION_SECRET.");
  return createHmac("sha256", secreto).update(texto).digest("base64url");
}

export async function abrirSesion(usuarioId: string, recordar: boolean) {
  // "Recordarme": 30 días. Sin él, la cookie muere al cerrar el navegador (y a las 12 h).
  const segundos = recordar ? 30 * DIA : DIA / 2;
  const cuerpo = `${usuarioId}.${Math.floor(Date.now() / 1000) + segundos}`;
  (await cookies()).set(COOKIE, `${cuerpo}.${firma(cuerpo)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: recordar ? segundos : undefined,
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}

/** El usuario de la cookie, si la firma vale, no venció y la cuenta sigue activa. */
export async function usuarioActual(): Promise<Usuario | null> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return null;
  const corte = valor.lastIndexOf(".");
  const cuerpo = valor.slice(0, corte);
  const recibida = Buffer.from(valor.slice(corte + 1));
  const esperada = Buffer.from(firma(cuerpo));
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
  const [usuarioId, vence] = cuerpo.split(".");
  if (Number(vence) < Date.now() / 1000) return null;
  const filas = await sql`
    select id, usuario, nombre, rol, activo from usuarios where id = ${usuarioId} and activo`;
  return (filas[0] as Usuario | undefined) ?? null;
}
