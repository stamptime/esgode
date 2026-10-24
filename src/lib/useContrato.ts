"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerContrato, type RespuestaContrato } from "@/server/contratos";
import type { Contrato } from "./types";

const SIN_CONEXION = "No se pudo conectar. Revisa tu conexión y vuelve a intentar.";

/** Corre una acción de contratos; rechaza con un Error cuyo mensaje ya está escrito para mostrarse. */
export async function pedir<T>(accion: Promise<({ ok: true } & T) | { ok: false; error: string }>): Promise<T> {
  let r: ({ ok: true } & T) | { ok: false; error: string };
  try {
    r = await accion;
  } catch {
    throw new Error(SIN_CONEXION);
  }
  if (!r.ok) throw new Error(r.error);
  return r;
}

/** Carga un contrato por id. `actuar` corre una acción que devuelve el contrato actualizado. */
export function useContrato(id: string) {
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    pedir(obtenerContrato(id))
      .then((r) => vigente && setContrato(r.contrato))
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [id]);

  const actuar = useCallback(async (accion: Promise<RespuestaContrato>): Promise<boolean> => {
    setOcupado(true);
    setError("");
    try {
      setContrato((await pedir(accion)).contrato);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setOcupado(false);
    }
  }, []);

  return { contrato, error, ocupado, actuar };
}
