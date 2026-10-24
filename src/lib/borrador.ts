import type { ContratoNuevo } from "./types";

// Borrador del formulario de contratos en el navegador del asesor. En el
// celular, al cambiar a WhatsApp para copiar datos, el navegador puede
// descargar la página; al volver se recarga y se perdía lo escrito. Se guarda
// por usuario, vence a las 12 horas y se borra al crear el borrador para
// revisión o al cerrar sesión. Si ya existe en el servidor, guarda su id.

export interface Borrador {
  paso: number;
  d: ContratoNuevo;
  jura: { tradicion: boolean; hurto: boolean; bloqueo: boolean };
  borradorId?: string | null; // el borrador en el servidor, si ya se guardó
  guardado: number; // ms
}

const PREFIJO = "esgode:borrador-contrato:";
const VIGENCIA_MS = 12 * 60 * 60 * 1000;

export function leerBorrador(usuarioId: string): Borrador | null {
  try {
    const b = JSON.parse(localStorage.getItem(PREFIJO + usuarioId) ?? "null") as Borrador | null;
    if (!b || !b.d?.cliente || !b.d?.equipo || Date.now() - b.guardado > VIGENCIA_MS) return null;
    return b;
  } catch {
    return null;
  }
}

export function guardarBorrador(usuarioId: string, b: Omit<Borrador, "guardado">) {
  try {
    localStorage.setItem(PREFIJO + usuarioId, JSON.stringify({ ...b, guardado: Date.now() }));
  } catch {
    // Sin almacenamiento (navegación privada, lleno): el formulario sigue funcionando.
  }
}

export function borrarBorrador(usuarioId?: string) {
  try {
    if (usuarioId) return localStorage.removeItem(PREFIJO + usuarioId);
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIJO)) localStorage.removeItem(k);
  } catch {}
}
