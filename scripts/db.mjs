// Prepara la base de datos y administra usuarios.
//
//   node --env-file=.env.local scripts/db.mjs setup
//       Crea las tablas y, si están vacías, carga los datos de ejemplo.
//   node --env-file=.env.local scripts/db.mjs usuario <usuario> "<Nombre>" <admin|staff> <contraseña>
//       Crea el usuario o le cambia nombre, rol y contraseña.
//   node --env-file=.env.local scripts/db.mjs desactivar <usuario>

import { neon } from "@neondatabase/serverless";
import { CATEGORIAS, FINANCIERAS, MARCAS, PRODUCTOS, TASAS_SEMILLA } from "../src/lib/seed.ts";
import { hashClave } from "../src/server/clave.ts";

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL);
const [comando, ...args] = process.argv.slice(2);

async function setup() {
  await sql.transaction([
    sql`create table if not exists usuarios (
      id text primary key default gen_random_uuid()::text,
      usuario text not null unique,
      nombre text not null,
      rol text not null check (rol in ('admin', 'staff')),
      activo boolean not null default true,
      clave_hash text not null)`,
    sql`create table if not exists categorias (
      id text primary key, nombre text not null, orden serial)`,
    sql`create table if not exists marcas (
      id text primary key,
      categoria_id text not null references categorias on delete cascade,
      nombre text not null, orden serial)`,
    sql`create table if not exists financieras (
      id text primary key, nombre text not null, orden serial)`,
    sql`create table if not exists productos (
      id text primary key,
      categoria_id text not null references categorias on delete cascade,
      marca_id text not null references marcas on delete cascade,
      nombre text not null,
      precio bigint not null check (precio > 0),
      activo boolean not null default true, orden serial)`,
    sql`create table if not exists tasas (
      id text primary key,
      categoria_id text not null references categorias on delete cascade,
      marca_id text not null references marcas on delete cascade,
      financiera_id text not null references financieras on delete cascade,
      tipo text not null check (tipo in ('mensual', 'ea')),
      tasa numeric(6, 3) not null check (tasa > 0),
      plazos int[] not null,
      inicial_min int not null default 0,
      activa boolean not null default true,
      actualizado_en timestamptz not null default now(),
      actualizado_por text not null default '',
      orden serial,
      unique (categoria_id, marca_id, financiera_id))`,
  ]);
  console.log("Tablas listas.");

  const [{ n }] = await sql`select count(*)::int as n from categorias`;
  if (n > 0) return console.log("Ya hay datos; no se cargan los de ejemplo.");
  await sql.transaction([
    ...CATEGORIAS.map((c) => sql`insert into categorias (id, nombre) values (${c.id}, ${c.nombre})`),
    ...MARCAS.map((m) => sql`insert into marcas (id, categoria_id, nombre) values (${m.id}, ${m.categoriaId}, ${m.nombre})`),
    ...FINANCIERAS.map((f) => sql`insert into financieras (id, nombre) values (${f.id}, ${f.nombre})`),
    ...PRODUCTOS.map(
      (p) => sql`insert into productos (id, categoria_id, marca_id, nombre, precio, activo)
        values (${p.id}, ${p.categoriaId}, ${p.marcaId}, ${p.nombre}, ${p.precio}, ${p.activo})`,
    ),
    ...TASAS_SEMILLA.map(
      (t) => sql`insert into tasas (id, categoria_id, marca_id, financiera_id, tipo, tasa, plazos, inicial_min, activa, actualizado_por)
        values (${t.id}, ${t.categoriaId}, ${t.marcaId}, ${t.financieraId}, ${t.tipo}, ${t.tasa}, ${t.plazos}::int[],
          ${t.inicialMin}, ${t.activa}, ${t.actualizadoPor})`,
    ),
  ]);
  console.log("Datos de ejemplo cargados.");
}

async function usuario() {
  const [nombreUsuario, nombre, rol, clave] = args;
  if (!nombreUsuario || !nombre || !["admin", "staff"].includes(rol) || !clave) {
    throw new Error('Uso: usuario <usuario> "<Nombre>" <admin|staff> <contraseña>');
  }
  await sql`
    insert into usuarios (usuario, nombre, rol, clave_hash)
    values (${nombreUsuario.toLowerCase()}, ${nombre}, ${rol}, ${hashClave(clave)})
    on conflict (usuario) do update
      set nombre = excluded.nombre, rol = excluded.rol, clave_hash = excluded.clave_hash, activo = true`;
  console.log(`Usuario ${nombreUsuario.toLowerCase()} (${rol}) listo.`);
}

async function desactivar() {
  const filas = await sql`update usuarios set activo = false where usuario = ${args[0] ?? ""} returning usuario`;
  console.log(filas.length ? `Usuario ${args[0]} desactivado.` : "No existe ese usuario.");
}

const comandos = { setup, usuario, desactivar };
if (!comandos[comando]) {
  console.error("Comandos: setup · usuario · desactivar");
  process.exit(1);
}
await comandos[comando]();
