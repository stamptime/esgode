import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const MARCA = "(PRUEBA E2E)";
export const ARCHIVO_ESTADO = join(__dirname, ".estado.json");

export interface EstadoE2E {
  admin: { usuario: string; clave: string };
  staff: { usuario: string; clave: string };
}

/** Lee .env.local (DATABASE_URL, BLOB_READ_WRITE_TOKEN) si no vienen en el entorno. */
export function cargarEntorno() {
  const archivo = join(__dirname, "../../.env.local");
  if (!existsSync(archivo)) return;
  for (const linea of readFileSync(archivo, "utf8").split("\n")) {
    const m = linea.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

export const estadoE2E = (): EstadoE2E => JSON.parse(readFileSync(ARCHIVO_ESTADO, "utf8"));
