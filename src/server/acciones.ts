"use server";

import { randomUUID } from "node:crypto";
import type { AjustesContratos, Datos, Producto, Tasa, TasaEditable, Usuario, UsuarioEditable } from "@/lib/types";
import { claveCoincide, hashClave } from "./clave";
import { sql } from "./db";
import { abrirSesion, cerrarSesion, usuarioActual } from "./sesion";

// Todas las acciones son endpoints públicos: cada una verifica la sesión y el rol.

export type Resultado =
  { ok: true; datos: Datos; id?: string } | { ok: false; error: string; sinSesion?: boolean };

const SIN_SESION: Resultado = { ok: false, error: "Tu sesión terminó. Vuelve a ingresar.", sinSesion: true };

/** `conUsuarios` solo para admin: la lista de cuentas no sale hacia el staff. */
async function leerDatos(conUsuarios: boolean): Promise<Datos> {
  const [categorias, marcas, financieras, productos, tasas, usuarios, ajustes] = await sql.transaction(
    [
      sql`select id, nombre from categorias order by orden`,
      sql`select id, categoria_id as "categoriaId", nombre from marcas order by orden`,
      sql`select id, nombre from financieras order by orden`,
      sql`select id, categoria_id as "categoriaId", marca_id as "marcaId", nombre,
            precio::float8 as precio, activo from productos order by orden`,
      sql`select id, categoria_id as "categoriaId", marca_id as "marcaId", financiera_id as "financieraId",
            tipo, tasa::float8 as tasa, plazos, inicial_min as "inicialMin", activa,
            actualizado_en as "actualizadoEn", actualizado_por as "actualizadoPor"
          from tasas order by orden`,
      sql`select id, usuario, nombre, rol, activo from usuarios order by lower(nombre)`,
      sql`select tasa_contratos::float8 as tasa, usura::float8 as usura from ajustes where id = 1`,
    ],
    { readOnly: true },
  );
  return {
    categorias,
    marcas,
    financieras,
    productos,
    tasas: tasas.map((t) => ({ ...t, actualizadoEn: new Date(t.actualizadoEn).toISOString() })),
    usuarios: conUsuarios ? usuarios : [],
    ajustes: (ajustes[0] as AjustesContratos | undefined) ?? { tasa: 1.9, usura: null },
  } as Datos;
}

/* ---------- Sesión ---------- */

export async function obtenerEstado(): Promise<{ usuario: Usuario; datos: Datos } | null> {
  const usuario = await usuarioActual();
  return usuario ? { usuario, datos: await leerDatos(usuario.rol === "admin") } : null;
}

export async function entrar(
  usuario: string,
  clave: string,
  recordar: boolean,
): Promise<{ usuario: Usuario; datos: Datos } | null> {
  const nombre = String(usuario).trim().toLowerCase();
  const filas = await sql`
    select id, usuario, nombre, rol, activo, clave_hash from usuarios where usuario = ${nombre} and activo`;
  const fila = filas[0];
  if (!fila || !claveCoincide(String(clave), fila.clave_hash)) return null;
  await abrirSesion(fila.id, recordar === true);
  const { id, nombre: completo, rol, activo } = fila;
  return {
    usuario: { id, usuario: nombre, nombre: completo, rol, activo },
    datos: await leerDatos(rol === "admin"),
  };
}

export async function salir() {
  await cerrarSesion();
}

/* ---------- Configuración (solo admin) ---------- */

/** Corre una escritura como admin y devuelve los datos frescos. */
async function comoAdmin(escribir: (admin: Usuario) => Promise<string | void>): Promise<Resultado> {
  const usuario = await usuarioActual();
  if (!usuario) return SIN_SESION;
  if (usuario.rol !== "admin")
    return { ok: false, error: "Solo administración puede cambiar la configuración." };
  try {
    const id = await escribir(usuario);
    return { ok: true, datos: await leerDatos(true), id: id ?? undefined };
  } catch (e) {
    if (e instanceof Invalido) return { ok: false, error: e.message };
    // 23505: unique_violation · 23503: foreign_key_violation
    const codigo = (e as { code?: string }).code;
    if (codigo === "23505")
      return { ok: false, error: "Ya existe un registro igual; cambia el nombre o la combinación." };
    if (codigo === "23503")
      return { ok: false, error: "Lo que elegiste ya no existe. Recarga la página y vuelve a intentar." };
    console.error(e);
    return { ok: false, error: "No se pudo guardar. Revisa tu conexión y vuelve a intentar." };
  }
}

class Invalido extends Error {}

function nombreValido(nombre: unknown): string {
  const limpio = String(nombre ?? "").trim();
  if (!limpio || limpio.length > 80) throw new Invalido("Escribe un nombre de hasta 80 caracteres.");
  return limpio;
}

export async function crearCategoria(nombre: string) {
  return comoAdmin(async () => {
    const id = randomUUID();
    await sql`insert into categorias (id, nombre) values (${id}, ${nombreValido(nombre)})`;
    return id;
  });
}

export async function actualizarCategoria(id: string, nombre: string) {
  return comoAdmin(async () => {
    await sql`update categorias set nombre = ${nombreValido(nombre)} where id = ${id}`;
  });
}

// Eliminar arrastra lo que depende (on delete cascade): una categoría se lleva
// sus marcas, y una marca o una financiera, sus tasas y productos.
export async function eliminarCategoria(id: string) {
  return comoAdmin(async () => {
    await sql`delete from categorias where id = ${id}`;
  });
}

export async function crearMarca(categoriaId: string, nombre: string) {
  return comoAdmin(async () => {
    const id = randomUUID();
    await sql`insert into marcas (id, categoria_id, nombre) values (${id}, ${categoriaId}, ${nombreValido(nombre)})`;
    return id;
  });
}

export async function actualizarMarca(id: string, nombre: string) {
  return comoAdmin(async () => {
    await sql`update marcas set nombre = ${nombreValido(nombre)} where id = ${id}`;
  });
}

export async function eliminarMarca(id: string) {
  return comoAdmin(async () => {
    await sql`delete from marcas where id = ${id}`;
  });
}

export async function crearFinanciera(nombre: string) {
  return comoAdmin(async () => {
    const id = randomUUID();
    await sql`insert into financieras (id, nombre) values (${id}, ${nombreValido(nombre)})`;
    return id;
  });
}

export async function actualizarFinanciera(id: string, nombre: string) {
  return comoAdmin(async () => {
    await sql`update financieras set nombre = ${nombreValido(nombre)} where id = ${id}`;
  });
}

export async function eliminarFinanciera(id: string) {
  return comoAdmin(async () => {
    await sql`delete from financieras where id = ${id}`;
  });
}

type ProductoEditable = Omit<Producto, "id" | "categoriaId">;

function productoValido(p: ProductoEditable) {
  const precio = Number(p.precio);
  if (!Number.isInteger(precio) || precio <= 0 || precio > 9_999_999_999)
    throw new Invalido("Escribe el precio en pesos, sin decimales.");
  return { nombre: nombreValido(p.nombre), marcaId: String(p.marcaId), precio, activo: p.activo === true };
}

// La categoría del producto es siempre la de su marca.
export async function crearProducto(datos: ProductoEditable) {
  return comoAdmin(async () => {
    const p = productoValido(datos);
    const id = randomUUID();
    await sql`
      insert into productos (id, categoria_id, marca_id, nombre, precio, activo)
      select ${id}, m.categoria_id, m.id, ${p.nombre}, ${p.precio}, ${p.activo} from marcas m where m.id = ${p.marcaId}`;
    return id;
  });
}

export async function actualizarProducto(id: string, datos: ProductoEditable) {
  return comoAdmin(async () => {
    const p = productoValido(datos);
    await sql`
      update productos set nombre = ${p.nombre}, precio = ${p.precio}, activo = ${p.activo},
        marca_id = m.id, categoria_id = m.categoria_id
      from marcas m where m.id = ${p.marcaId} and productos.id = ${id}`;
  });
}

export async function eliminarProducto(id: string) {
  return comoAdmin(async () => {
    await sql`delete from productos where id = ${id}`;
  });
}

function tasaValida(t: TasaEditable) {
  const tasa = Number(t.tasa);
  const inicialMin = Number(t.inicialMin);
  const plazos = [...new Set((t.plazos ?? []).map(Number))].sort((a, b) => a - b);
  if (t.tipo !== "mensual" && t.tipo !== "ea") throw new Invalido("Elige el tipo de tasa.");
  if (!(tasa > 0 && tasa <= 100)) throw new Invalido("Escribe una tasa mayor que 0, por ejemplo 2,1.");
  if (!plazos.length || plazos.some((p) => !Number.isInteger(p) || p < 1 || p > 120))
    throw new Invalido("Elige al menos un plazo.");
  if (!Number.isInteger(inicialMin) || inicialMin < 0 || inicialMin > 90)
    throw new Invalido("Escribe un porcentaje entero entre 0 y 90.");
  return { tipo: t.tipo, tasa, plazos, inicialMin, activa: t.activa === true };
}

export async function crearTasa(clave: Pick<Tasa, "marcaId" | "financieraId">, datos: TasaEditable) {
  return comoAdmin(async (admin) => {
    const t = tasaValida(datos);
    const id = randomUUID();
    await sql`
      insert into tasas (id, categoria_id, marca_id, financiera_id, tipo, tasa, plazos, inicial_min, activa, actualizado_por)
      select ${id}, m.categoria_id, m.id, ${clave.financieraId}, ${t.tipo}, ${t.tasa}, ${t.plazos}::int[],
        ${t.inicialMin}, ${t.activa}, ${admin.nombre}
      from marcas m where m.id = ${clave.marcaId}`;
    return id;
  });
}

export async function actualizarTasa(id: string, datos: TasaEditable) {
  return comoAdmin(async (admin) => {
    const t = tasaValida(datos);
    await sql`
      update tasas set tipo = ${t.tipo}, tasa = ${t.tasa}, plazos = ${t.plazos}::int[], inicial_min = ${t.inicialMin},
        activa = ${t.activa}, actualizado_en = now(), actualizado_por = ${admin.nombre}
      where id = ${id}`;
  });
}

export async function eliminarTasa(id: string) {
  return comoAdmin(async () => {
    await sql`delete from tasas where id = ${id}`;
  });
}

/* ---------- Usuarios y roles ---------- */

function usuarioValido(u: UsuarioEditable, claveObligatoria: boolean) {
  const usuario = String(u.usuario ?? "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(usuario))
    throw new Invalido("Escribe el usuario en minúsculas, sin espacios ni tildes, por ejemplo nombre.apellido.");
  if (u.rol !== "admin" && u.rol !== "staff") throw new Invalido("Elige el rol del usuario.");
  const clave = String(u.clave ?? "");
  if ((claveObligatoria || clave) && (clave.length < 8 || clave.length > 100))
    throw new Invalido("Escribe una contraseña de al menos 8 caracteres.");
  return { usuario, nombre: nombreValido(u.nombre), rol: u.rol, activo: u.activo === true, clave };
}

export async function crearUsuario(datos: UsuarioEditable) {
  return comoAdmin(async () => {
    const u = usuarioValido(datos, true);
    const id = randomUUID();
    await sql`
      insert into usuarios (id, usuario, nombre, rol, activo, clave_hash)
      values (${id}, ${u.usuario}, ${u.nombre}, ${u.rol}, ${u.activo}, ${hashClave(u.clave)})`;
    return id;
  });
}

// Nadie se quita a sí mismo el acceso: así siempre queda un administrador activo.
export async function actualizarUsuario(id: string, datos: UsuarioEditable) {
  return comoAdmin(async (admin) => {
    const u = usuarioValido(datos, false);
    if (id === admin.id && (u.rol !== "admin" || !u.activo))
      throw new Invalido("No puedes quitarte el rol de administrador ni desactivar tu cuenta; pídeselo a otro administrador.");
    await sql`
      update usuarios set usuario = ${u.usuario}, nombre = ${u.nombre}, rol = ${u.rol}, activo = ${u.activo},
        clave_hash = coalesce(${u.clave ? hashClave(u.clave) : null}, clave_hash)
      where id = ${id}`;
  });
}

export async function eliminarUsuario(id: string) {
  return comoAdmin(async (admin) => {
    if (id === admin.id)
      throw new Invalido("No puedes eliminar tu propia cuenta; pídeselo a otro administrador.");
    await sql`delete from usuarios where id = ${id}`;
  });
}

/* ---------- Contratos: tasa del mes ---------- */

export async function guardarAjustes(datos: AjustesContratos) {
  return comoAdmin(async (admin) => {
    const tasa = Number(datos.tasa);
    const usura = datos.usura == null ? null : Number(datos.usura);
    if (!(tasa > 0 && tasa <= 10)) throw new Invalido("Escribe la tasa mensual, por ejemplo 1,9.");
    if (usura != null && !(usura > 0 && usura <= 10))
      throw new Invalido("Escribe la usura mensual, por ejemplo 2,1, o déjala vacía.");
    await sql`
      insert into ajustes (id, tasa_contratos, usura, actualizado_por) values (1, ${tasa}, ${usura}, ${admin.nombre})
      on conflict (id) do update set tasa_contratos = excluded.tasa_contratos, usura = excluded.usura,
        actualizado_en = now(), actualizado_por = excluded.actualizado_por`;
  });
}
