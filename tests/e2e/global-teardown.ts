import { rmSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { del, list } from "@vercel/blob";
import { ARCHIVO_ESTADO, MARCA, cargarEntorno } from "./entorno";

// Borra los contratos de prueba con sus fotos y la cuenta temporal.

export default async function globalTeardown() {
  cargarEntorno();
  const sql = neon(process.env.DATABASE_URL!);
  const filas = await sql`delete from contratos where cliente->>'nombre' like ${"%" + MARCA + "%"} returning id`;
  for (const { id } of filas) {
    const { blobs } = await list({ prefix: `contratos/${id}/` });
    if (blobs.length) await del(blobs.map((b) => b.pathname));
  }
  await sql`delete from usuarios where usuario = 'prueba.e2e'`;
  rmSync(ARCHIVO_ESTADO, { force: true });
  console.log(`Limpieza: ${filas.length} contratos de prueba borrados.`);
}
