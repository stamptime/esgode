"use client";

import type { Contrato, Foto, HuecoFoto } from "./types";

// Fotos tomadas con la cámara del celular: se reducen a 1600 px en JPEG antes
// de subirlas (una foto de iPhone pasa de ~4 MB a ~300 KB) y se suben al
// contrato por /api/contratos/<id>/fotos.

const LADO_MAX = 1600;

export const urlFoto = (contratoId: string, f: Foto) =>
  `/api/contratos/${contratoId}/fotos/${encodeURIComponent(f.archivo)}`;

async function comprimir(archivo: File): Promise<Blob> {
  if (archivo.type === "application/pdf") return archivo;
  try {
    const img = await createImageBitmap(archivo);
    const k = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * k);
    canvas.height = Math.round(img.height * k);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.close();
    const jpg = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    return jpg ?? archivo;
  } catch {
    // El navegador no pudo leerla (formato raro): se sube tal cual y el servidor decide.
    return archivo;
  }
}

/** Sube la foto y devuelve el contrato actualizado; si falla, el error trae el mensaje para mostrar. */
export async function subirFoto(contratoId: string, hueco: HuecoFoto | "entrega", archivo: File): Promise<Contrato> {
  const form = new FormData();
  form.set("hueco", hueco);
  form.set("archivo", await comprimir(archivo));
  let r: Response;
  try {
    r = await fetch(`/api/contratos/${contratoId}/fotos`, { method: "POST", body: form });
  } catch {
    throw new Error("No se pudo subir la foto. Revisa tu conexión y vuelve a intentar.");
  }
  const cuerpo = (await r.json().catch(() => null)) as { ok: boolean; error?: string; contrato?: Contrato } | null;
  if (!r.ok || !cuerpo?.ok || !cuerpo.contrato)
    throw new Error(cuerpo?.error ?? "No se pudo subir la foto. Vuelve a intentar.");
  return cuerpo.contrato;
}
