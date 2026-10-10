"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { TASAS_SEMILLA, USUARIOS } from "./seed";
import type { Rol, Tasa, TasaEditable, Usuario } from "./types";

// Store en memoria (sin backend todavía). Se respalda en el almacenamiento del
// navegador para que las tasas y la sesión sobrevivan a una recarga.

interface Estado {
  listo: boolean; // false en el servidor y hasta hidratar
  tasas: Tasa[];
  usuarioId: string | null;
}

const CLAVE_TASAS = "esgode.tasas.v1";
const CLAVE_SESION = "esgode.sesion.v1";

const SERVIDOR: Estado = { listo: false, tasas: [], usuarioId: null };
let estado: Estado | null = null;
const oyentes = new Set<() => void>();

function cargar(): Estado {
  let tasas = TASAS_SEMILLA;
  let usuarioId: string | null = null;
  try {
    const guardadas = localStorage.getItem(CLAVE_TASAS);
    if (guardadas) tasas = JSON.parse(guardadas) as Tasa[];
    usuarioId = sessionStorage.getItem(CLAVE_SESION) ?? localStorage.getItem(CLAVE_SESION);
  } catch {
    // Almacenamiento bloqueado o dañado: seguimos solo en memoria.
  }
  return { listo: true, tasas, usuarioId };
}

function leer(): Estado {
  if (!estado) estado = cargar();
  return estado;
}

function publicar(siguiente: Estado) {
  estado = siguiente;
  oyentes.forEach((avisar) => avisar());
}

function guardarTasas(tasas: Tasa[]) {
  try {
    localStorage.setItem(CLAVE_TASAS, JSON.stringify(tasas));
  } catch {}
  publicar({ ...leer(), tasas });
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  // Otra pestaña cambió tasas o sesión.
  const alCambiar = (e: StorageEvent) => {
    if (e.key === CLAVE_TASAS || e.key === CLAVE_SESION) publicar(cargar());
  };
  window.addEventListener("storage", alCambiar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", alCambiar);
  };
}

export function useStore(): Estado {
  return useSyncExternalStore(suscribir, leer, () => SERVIDOR);
}

/* ---------- Sesión ---------- */

function usuarioDe(id: string | null): Usuario | null {
  const u = USUARIOS.find((x) => x.id === id && x.activo);
  if (!u) return null;
  return { id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol, activo: u.activo };
}

export const inicioDe = (rol: Rol) => (rol === "admin" ? "/admin/tasas" : "/calculadora");

async function sha256(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function iniciarSesion(usuario: string, clave: string, recordar: boolean): Promise<Usuario | null> {
  const nombre = usuario.trim().toLowerCase();
  const hash = await sha256(`${nombre}:${clave}`);
  const u = USUARIOS.find((x) => x.activo && x.usuario === nombre && x.hash === hash);
  if (!u) return null;
  try {
    localStorage.removeItem(CLAVE_SESION);
    sessionStorage.removeItem(CLAVE_SESION);
    (recordar ? localStorage : sessionStorage).setItem(CLAVE_SESION, u.id);
  } catch {}
  publicar({ ...leer(), usuarioId: u.id });
  return usuarioDe(u.id);
}

export function cerrarSesion() {
  try {
    localStorage.removeItem(CLAVE_SESION);
    sessionStorage.removeItem(CLAVE_SESION);
  } catch {}
  publicar({ ...leer(), usuarioId: null });
}

export function useSesion(): { listo: boolean; usuario: Usuario | null } {
  const { listo, usuarioId } = useStore();
  return { listo, usuario: usuarioDe(usuarioId) };
}

/** Devuelve el usuario si su rol está permitido; si no, redirige y devuelve null. */
export function useRequerirRol(roles: Rol[]): Usuario | null {
  const { listo, usuario } = useSesion();
  const router = useRouter();
  const permitido = !!usuario && roles.includes(usuario.rol);
  const destino = !listo || permitido ? null : usuario ? inicioDe(usuario.rol) : "/login";
  useEffect(() => {
    if (destino) router.replace(destino);
  }, [destino, router]);
  return permitido ? usuario : null;
}

/* ---------- Tasas ---------- */

function sello(): Pick<Tasa, "actualizadoEn" | "actualizadoPor"> {
  return {
    actualizadoEn: new Date().toISOString(),
    actualizadoPor: usuarioDe(leer().usuarioId)?.nombre ?? "",
  };
}

export function crearTasa(
  clave: Pick<Tasa, "categoriaId" | "marcaId" | "financieraId">,
  datos: TasaEditable,
): Tasa {
  const { tasas } = leer();
  const existe = tasas.some(
    (t) =>
      t.categoriaId === clave.categoriaId &&
      t.marcaId === clave.marcaId &&
      t.financieraId === clave.financieraId,
  );
  if (existe) throw new Error("Ya existe una tasa para esa marca y financiera.");
  const nueva: Tasa = { id: crypto.randomUUID(), ...clave, ...datos, ...sello() };
  guardarTasas([...tasas, nueva]);
  return nueva;
}

export function actualizarTasa(id: string, datos: TasaEditable) {
  guardarTasas(leer().tasas.map((t) => (t.id === id ? { ...t, ...datos, ...sello() } : t)));
}

export function eliminarTasa(id: string) {
  guardarTasas(leer().tasas.filter((t) => t.id !== id));
}
