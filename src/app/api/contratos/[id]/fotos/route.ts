import type { NextRequest } from "next/server";
import type { Foto, HuecoFoto } from "@/lib/types";
import { sql } from "@/server/db";
import { TIPOS_FOTO, borrarFotos, subirFoto } from "@/server/fotos";
import { leerContrato } from "@/server/registro";
import { usuarioActual } from "@/server/sesion";

// Sube una foto del contrato. Las de cédula y equipo son parte del contenido
// (solo en borrador); la evidencia de entrega se agrega en cualquier etapa; la
// foto del original firmado en papel marca el contrato aprobado como firmado.

const DEL_BORRADOR = ["cedulaFrente", "cedulaReverso", "frente", "reverso", "pantalla", "detalle"];
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_ENTREGAS = 12;

const error = (status: number, mensaje: string) => Response.json({ ok: false, error: mensaje }, { status });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/contratos/[id]/fotos">) {
  const usuario = await usuarioActual();
  if (!usuario) return error(401, "Tu sesión terminó. Vuelve a ingresar.");
  const { id } = await ctx.params;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error(400, "No llegó la foto. Vuelve a intentar.");
  }
  const hueco = String(form.get("hueco") ?? "");
  const archivo = form.get("archivo");
  if (!(archivo instanceof Blob) || !archivo.size) return error(400, "No llegó la foto. Vuelve a intentar.");
  if (archivo.size > MAX_BYTES) return error(413, "La foto pesa demasiado. Tómala de nuevo.");
  if (!TIPOS_FOTO[archivo.type] || (archivo.type === "application/pdf" && hueco !== "firmado"))
    return error(415, "Sube una foto (JPG o PNG).");

  const c = await leerContrato(id);
  if (!c) return error(404, "Ese contrato ya no existe.");
  if (c.anulado) return error(409, "Este contrato fue anulado.");

  const foto = (archivo: string): Foto => ({ archivo, en: new Date().toISOString(), por: usuario.nombre });

  if (DEL_BORRADOR.includes(hueco)) {
    if (c.etapa !== "borrador")
      return error(409, "El contrato ya está aprobado. Vuélvelo a borrador para cambiar esta foto.");
    const nombre = await subirFoto(c.id, hueco, archivo);
    const filas = await sql`update contratos set fotos = fotos || ${JSON.stringify({ [hueco]: foto(nombre) })}::jsonb,
      editado_en = now(), editado_por = ${usuario.nombre}
      where id = ${c.id} and aprobado_en is null and not anulado returning id`;
    if (!filas.length) {
      await borrarFotos(c.id, [nombre]);
      return error(409, "El contrato cambió de etapa. Recarga la página.");
    }
    const anterior = c.fotos[hueco as HuecoFoto] as Foto | undefined;
    if (anterior) await borrarFotos(c.id, [anterior.archivo]);
  } else if (hueco === "entrega") {
    if ((c.fotos.entregas ?? []).length >= MAX_ENTREGAS)
      return error(409, `Se pueden agregar hasta ${MAX_ENTREGAS} fotos de entrega.`);
    const nombre = await subirFoto(c.id, hueco, archivo);
    // Se agrega al final de la lista sin pisar fotos que otro asesor haya subido a la vez.
    await sql`update contratos set fotos = jsonb_set(fotos, '{entregas}',
        coalesce(fotos->'entregas', '[]'::jsonb) || ${JSON.stringify([foto(nombre)])}::jsonb)
      where id = ${c.id}`;
  } else if (hueco === "firmado") {
    if (c.etapa !== "aprobado")
      return error(
        409,
        c.etapa === "firmado" ? "Este contrato ya está firmado." : "Primero hay que aprobar el contrato.",
      );
    const nombre = await subirFoto(c.id, hueco, archivo);
    const filas = await sql`update contratos set fotos = fotos || ${JSON.stringify({ firmado: foto(nombre) })}::jsonb,
        firma = 'papel', firmado_en = now()
      where id = ${c.id} and aprobado_en is not null and firma = 'pendiente' and not anulado returning id`;
    if (!filas.length) {
      await borrarFotos(c.id, [nombre]);
      return error(409, "Este contrato ya está firmado.");
    }
  } else {
    return error(400, "Esa foto no existe.");
  }
  return Response.json({ ok: true, contrato: await leerContrato(c.id) });
}
