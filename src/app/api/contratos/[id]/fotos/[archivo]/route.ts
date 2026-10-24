import type { NextRequest } from "next/server";
import type { Foto } from "@/lib/types";
import { leerFoto } from "@/server/fotos";
import { leerContrato } from "@/server/registro";
import { usuarioActual } from "@/server/sesion";

// Muestra una foto del contrato a quien tenga sesión. Solo sirve archivos que
// el contrato tiene registrados.

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/contratos/[id]/fotos/[archivo]">) {
  if (!(await usuarioActual())) return new Response("Sin sesión", { status: 401 });
  const { id, archivo } = await ctx.params;
  const c = await leerContrato(id);
  const fotos = c
    ? [...Object.values(c.fotos).filter((f): f is Foto => !Array.isArray(f) && !!f), ...(c.fotos.entregas ?? [])]
    : [];
  if (!c || !fotos.some((f) => f.archivo === archivo)) return new Response("No existe", { status: 404 });
  const r = await leerFoto(c.id, archivo);
  if (!r || r.statusCode !== 200) return new Response("No existe", { status: 404 });
  return new Response(r.stream, {
    headers: {
      "content-type": r.blob.contentType ?? "image/jpeg",
      // El nombre del archivo es único: el navegador puede guardarla mientras dure la sesión.
      "cache-control": "private, max-age=86400, immutable",
    },
  });
}
