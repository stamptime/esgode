import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { hashClave } from "../../src/server/clave";
import { ARCHIVO_ESTADO, cargarEntorno, type EstadoE2E } from "./entorno";

// Crea una cuenta de administración temporal (la contraseña real del admin no
// se usa en pruebas). El staff es la cuenta demo.

export default async function globalSetup() {
  cargarEntorno();
  const sql = neon(process.env.DATABASE_URL!);
  const estado: EstadoE2E = {
    admin: { usuario: "prueba.e2e", clave: randomBytes(12).toString("base64url") },
    staff: { usuario: "demo", clave: process.env.E2E_STAFF_CLAVE ?? "demo2026" },
  };
  await sql`
    insert into usuarios (usuario, nombre, rol, clave_hash)
    values (${estado.admin.usuario}, 'Admin de pruebas', 'admin', ${hashClave(estado.admin.clave)})
    on conflict (usuario) do update set clave_hash = excluded.clave_hash, rol = 'admin', activo = true`;
  writeFileSync(ARCHIVO_ESTADO, JSON.stringify(estado));
}
