"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import * as servidor from "@/server/acciones";
import { borrarBorrador } from "./borrador";
import type { Resultado } from "@/server/acciones";
import type { AjustesContratos, Datos, Producto, Rol, Tasa, TasaEditable, Usuario, UsuarioEditable } from "./types";

// Copia en el navegador de lo que vive en la base de datos. Se carga al abrir,
// se refresca al volver a la pestaña y cada minuto, y cada escritura pasa por
// una acción del servidor que devuelve los datos frescos.

interface Estado extends Datos {
  listo: boolean; // false en el servidor y hasta la primera carga
  usuario: Usuario | null;
}

const VACIO: Datos = {
  categorias: [],
  marcas: [],
  financieras: [],
  productos: [],
  tasas: [],
  usuarios: [],
  ajustes: { tasa: 1.9, usura: null },
};
const INICIAL: Estado = { listo: false, usuario: null, ...VACIO };
const REFRESCO_MS = 60_000;

let estado = INICIAL;
let cargando: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function publicar(cambios: Partial<Estado>) {
  estado = { ...estado, ...cambios };
  oyentes.forEach((avisar) => avisar());
}

function refrescar(): Promise<void> {
  cargando ??= servidor
    .obtenerEstado()
    .then((r) =>
      publicar(r ? { listo: true, usuario: r.usuario, ...r.datos } : { listo: true, usuario: null, ...VACIO }),
    )
    // Sin conexión: se conserva lo que haya y se reintenta en el próximo refresco.
    .catch(() => publicar({ listo: true }))
    .finally(() => {
      cargando = null;
    });
  return cargando;
}

function alVolver() {
  if (document.visibilityState === "visible" && estado.usuario) refrescar();
}
let reloj: ReturnType<typeof setInterval> | undefined;

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  if (oyentes.size === 1) {
    if (!estado.listo) refrescar();
    document.addEventListener("visibilitychange", alVolver);
    reloj = setInterval(alVolver, REFRESCO_MS);
  }
  return () => {
    oyentes.delete(avisar);
    if (oyentes.size === 0) {
      document.removeEventListener("visibilitychange", alVolver);
      clearInterval(reloj);
    }
  };
}

export function useStore(): Estado {
  return useSyncExternalStore(
    suscribir,
    () => estado,
    () => INICIAL,
  );
}

/* ---------- Sesión ---------- */

export const inicioDe = (rol: Rol) => (rol === "admin" ? "/admin/tasas" : "/calculadora");

export async function iniciarSesion(usuario: string, clave: string, recordar: boolean): Promise<Usuario | null> {
  const r = await servidor.entrar(usuario, clave, recordar);
  if (!r) return null;
  publicar({ listo: true, usuario: r.usuario, ...r.datos });
  return r.usuario;
}

export async function cerrarSesion() {
  borrarBorrador(); // datos de clientes a medio llenar no quedan en el equipo
  publicar({ usuario: null, ...VACIO });
  await servidor.salir();
}

export function useSesion(): { listo: boolean; usuario: Usuario | null } {
  const { listo, usuario } = useStore();
  return { listo, usuario };
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

/* ---------- Configuración (solo admin) ---------- */
// Cada función resuelve con el id creado (si aplica) o rechaza con un Error
// cuyo mensaje ya está escrito para mostrarse.

async function escribir(pedido: Promise<Resultado>): Promise<string | undefined> {
  let r: Resultado;
  try {
    r = await pedido;
  } catch {
    throw new Error("No se pudo guardar. Revisa tu conexión y vuelve a intentar.");
  }
  if (!r.ok) {
    if (r.sinSesion) publicar({ usuario: null, ...VACIO });
    throw new Error(r.error);
  }
  // Si el admin editó su propia cuenta, la sesión muestra el nombre nuevo.
  const yo = r.datos.usuarios.find((u) => u.id === estado.usuario?.id);
  publicar(yo ? { ...r.datos, usuario: yo } : r.datos);
  return r.id;
}

export const crearCategoria = (nombre: string) => escribir(servidor.crearCategoria(nombre));
export const actualizarCategoria = (id: string, nombre: string) => escribir(servidor.actualizarCategoria(id, nombre));
export const eliminarCategoria = (id: string) => escribir(servidor.eliminarCategoria(id));

export const crearMarca = (categoriaId: string, nombre: string) => escribir(servidor.crearMarca(categoriaId, nombre));
export const actualizarMarca = (id: string, nombre: string) => escribir(servidor.actualizarMarca(id, nombre));
export const eliminarMarca = (id: string) => escribir(servidor.eliminarMarca(id));

export const crearFinanciera = (nombre: string) => escribir(servidor.crearFinanciera(nombre));
export const actualizarFinanciera = (id: string, nombre: string) => escribir(servidor.actualizarFinanciera(id, nombre));
export const eliminarFinanciera = (id: string) => escribir(servidor.eliminarFinanciera(id));

type ProductoEditable = Omit<Producto, "id" | "categoriaId">;
export const crearProducto = (datos: ProductoEditable) => escribir(servidor.crearProducto(datos));
export const actualizarProducto = (id: string, datos: ProductoEditable) =>
  escribir(servidor.actualizarProducto(id, datos));
export const eliminarProducto = (id: string) => escribir(servidor.eliminarProducto(id));

export const crearTasa = (clave: Pick<Tasa, "marcaId" | "financieraId">, datos: TasaEditable) =>
  escribir(servidor.crearTasa(clave, datos));
export const actualizarTasa = (id: string, datos: TasaEditable) => escribir(servidor.actualizarTasa(id, datos));
export const eliminarTasa = (id: string) => escribir(servidor.eliminarTasa(id));

export const crearUsuario = (datos: UsuarioEditable) => escribir(servidor.crearUsuario(datos));
export const actualizarUsuario = (id: string, datos: UsuarioEditable) =>
  escribir(servidor.actualizarUsuario(id, datos));
export const eliminarUsuario = (id: string) => escribir(servidor.eliminarUsuario(id));

export const guardarAjustes = (datos: AjustesContratos) => escribir(servidor.guardarAjustes(datos));
