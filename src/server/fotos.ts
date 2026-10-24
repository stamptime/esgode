import "server-only";
import { randomUUID } from "node:crypto";
import { del, get, list, put } from "@vercel/blob";

// Fotos de los contratos (cédula, equipo, entregas, original firmado) en un
// almacenamiento privado de Vercel Blob. Nunca se exponen con su URL: se
// sirven por /api/contratos/<id>/fotos/<archivo> después de revisar la sesión.

const carpeta = (contratoId: string) => `contratos/${contratoId}/`;

export const TIPOS_FOTO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Sube el archivo y devuelve su nombre dentro de la carpeta del contrato. */
export async function subirFoto(contratoId: string, hueco: string, archivo: Blob): Promise<string> {
  const nombre = `${hueco}-${randomUUID().slice(0, 8)}.${TIPOS_FOTO[archivo.type] ?? "jpg"}`;
  await put(carpeta(contratoId) + nombre, archivo, {
    access: "private",
    contentType: archivo.type || "image/jpeg",
    addRandomSuffix: false,
  });
  return nombre;
}

export async function leerFoto(contratoId: string, archivo: string) {
  return get(carpeta(contratoId) + archivo, { access: "private" });
}

/** Borra los archivos dados o, sin lista, toda la carpeta del contrato. Si falla, quedan huérfanos pero no rompe la acción. */
export async function borrarFotos(contratoId: string, archivos?: string[]) {
  try {
    if (archivos) {
      if (archivos.length) await del(archivos.map((a) => carpeta(contratoId) + a));
      return;
    }
    let cursor: string | undefined;
    do {
      const pagina = await list({ prefix: carpeta(contratoId), cursor });
      if (pagina.blobs.length) await del(pagina.blobs.map((b) => b.pathname));
      cursor = pagina.hasMore ? pagina.cursor : undefined;
    } while (cursor);
  } catch (e) {
    console.error("No se pudieron borrar fotos del contrato", contratoId, e);
  }
}
