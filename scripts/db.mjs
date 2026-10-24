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
    sql`create table if not exists ajustes (
      id int primary key default 1 check (id = 1),
      tasa_contratos numeric(6, 3) not null default 1.9 check (tasa_contratos > 0),
      usura numeric(6, 3) check (usura > 0),
      actualizado_en timestamptz not null default now(),
      actualizado_por text not null default '')`,
    sql`insert into ajustes (id) values (1) on conflict do nothing`,
    sql`create table if not exists contratos (
      id text primary key,
      tipo text not null check (tipo in ('acuerdo', 'compraventa')),
      anio int not null,
      numero int not null,
      forma text not null check (forma in ('cuotas', 'unico')),
      con_intereses boolean not null default false,
      cliente jsonb not null,
      equipo jsonb not null,
      capital bigint not null check (capital > 0),
      n_cuotas int not null default 1,
      fecha_pago date,
      tasa numeric(6, 3) not null default 0,
      mes_tasa text not null default '',
      intereses bigint,
      dias_devolucion int,
      firma text not null default 'pendiente' check (firma in ('pendiente', 'digital', 'papel')),
      firma_trazo text,
      firmado_en timestamptz,
      firma_dispositivo text,
      verificacion text,
      pagos jsonb not null default '[]',
      copias jsonb not null default '{}',
      anulado boolean not null default false,
      creado_en timestamptz not null default now(),
      creado_por text not null,
      unique (tipo, anio, numero))`,
  ]);
  await migrar();
  console.log("Tablas listas.");

  const [{ n }] = await sql`select count(*)::int as n from categorias`;
  if (n > 0) return console.log("Ya hay datos; no se cargan los de ejemplo.");
  await sql.transaction([
    ...CATEGORIAS.map((c) => sql`insert into categorias (id, nombre) values (${c.id}, ${c.nombre})`),
    ...MARCAS.map(
      (m) => sql`insert into marcas (id, categoria_id, nombre) values (${m.id}, ${m.categoriaId}, ${m.nombre})`,
    ),
    ...FINANCIERAS.map((f) => sql`insert into financieras (id, nombre) values (${f.id}, ${f.nombre})`),
    ...PRODUCTOS.map(
      (p) => sql`insert into productos (id, categoria_id, marca_id, nombre, precio, activo)
        values (${p.id}, ${p.categoriaId}, ${p.marcaId}, ${p.nombre}, ${p.precio}, ${p.activo})`,
    ),
    ...TASAS_SEMILLA.map(
      (
        t,
      ) => sql`insert into tasas (id, categoria_id, marca_id, financiera_id, tipo, tasa, plazos, inicial_min, activa, actualizado_por)
        values (${t.id}, ${t.categoriaId}, ${t.marcaId}, ${t.financieraId}, ${t.tipo}, ${t.tasa}, ${t.plazos}::int[],
          ${t.inicialMin}, ${t.activa}, ${t.actualizadoPor})`,
    ),
  ]);
  console.log("Datos de ejemplo cargados.");
}

// Cambios sobre tablas que ya existen. Cada migración corre una sola vez.
const MIGRACIONES = {
  "2026-10-contratos-borradores": [
    sql`alter table contratos
      add column if not exists acreedor text not null default 'esmer' check (acreedor in ('esmer', 'elex')),
      add column if not exists periodo text not null default 'mensual' check (periodo in ('mensual', 'quincenal', 'semanal')),
      add column if not exists precio bigint,
      add column if not exists inicial bigint,
      add column if not exists paso int not null default 1,
      add column if not exists aprobado_en timestamptz,
      add column if not exists aprobado_por text,
      add column if not exists firma_lienzo text not null default '358 168',
      add column if not exists fotos jsonb not null default '{}',
      add column if not exists motivo_anulacion text,
      add column if not exists editado_en timestamptz not null default now(),
      add column if not exists editado_por text not null default '',
      add column if not exists creado_por_id text`,
    sql`alter table contratos alter column anio drop not null, alter column numero drop not null`,
    sql`alter table contratos drop constraint if exists contratos_capital_check`,
    sql`alter table contratos add constraint contratos_capital_check check (capital >= 0)`,
    // Los contratos generados antes de los borradores ya tenían número: quedan aprobados (o firmados).
    sql`update contratos set aprobado_en = creado_en, aprobado_por = creado_por, editado_en = creado_en, editado_por = creado_por
      where aprobado_en is null and numero is not null`,
    // Las copias cambian de nombre por posición: Cartera, Contabilidad, Archivo → Contabilidad, Tienda, Gerencia.
    sql`update contratos set copias = jsonb_strip_nulls(jsonb_build_object(
      'original', copias->'original', 'contabilidad', copias->'cartera', 'tienda', copias->'contabilidad', 'gerencia', copias->'archivo'))`,
  ],
  // Contratos que generó la versión anterior mientras se publicaba esta (tienen número pero no aprobación).
  "2026-10-contratos-previos": [
    sql`update contratos set aprobado_en = creado_en, aprobado_por = creado_por, editado_en = creado_en, editado_por = creado_por
      where aprobado_en is null and numero is not null and editado_por = ''`,
  ],
};

async function migrar() {
  await sql`create table if not exists migraciones (nombre text primary key, en timestamptz not null default now())`;
  const hechas = new Set((await sql`select nombre from migraciones`).map((f) => f.nombre));
  for (const [nombre, pasos] of Object.entries(MIGRACIONES)) {
    if (hechas.has(nombre)) continue;
    await sql.transaction([...pasos, sql`insert into migraciones (nombre) values (${nombre})`]);
    console.log(`Migración ${nombre} aplicada.`);
  }
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
