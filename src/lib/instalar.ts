"use client";

import { useSyncExternalStore } from "react";

// Instalar Esgode como app. Chrome y Edge (Android y escritorio) avisan con
// `beforeinstallprompt`, que se guarda para mostrar el aviso nativo al tocar
// «Instalar». En iPhone no existe: se muestran los pasos Compartir › Agregar a
// inicio. No se ofrece si ya está instalada o si se tocó «Ahora no».

interface AvisoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DESCARTADO = "esgode:instalar-descartado";

let aviso: AvisoInstalacion | null = null;
let estado: { aviso: AvisoInstalacion | null; instalada: boolean; descartado: boolean; iphone: boolean } | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    aviso = e as AvisoInstalacion;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    aviso = null;
    if (estado) estado = { ...estado, aviso: null, instalada: true };
    avisar();
  });
}

function suscribir(f: () => void) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

export const esIphone = () =>
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const instalada = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

function leerDescartado(): boolean {
  try {
    return localStorage.getItem(DESCARTADO) === "1";
  } catch {
    return false;
  }
}

interface Estado {
  aviso: AvisoInstalacion | null;
  instalada: boolean;
  descartado: boolean;
  iphone: boolean;
}

/** Lo que sabe el navegador; en el servidor no hay estado (no se ofrece instalar). */
function leer(): Estado | null {
  if (typeof window === "undefined") return null;
  if (!estado || estado.aviso !== aviso) {
    estado = {
      aviso,
      instalada: estado?.instalada || instalada(),
      descartado: estado?.descartado || leerDescartado(),
      iphone: esIphone(),
    };
  }
  return estado;
}

function marcar(cambio: Partial<Estado>) {
  estado = { ...leer()!, ...cambio };
  avisar();
}

export function useInstalar() {
  const e = useSyncExternalStore(suscribir, leer, () => null);
  const evento = e?.aviso ?? null;
  return {
    disponible: !!e && !e.instalada && !e.descartado && (e.iphone || !!evento),
    iphone: !!e?.iphone,
    /** Hay aviso nativo (Android, Chrome o Edge de escritorio). */
    nativo: !!evento,
    async instalar(): Promise<boolean> {
      if (!evento) return false;
      await evento.prompt();
      const { outcome } = await evento.userChoice;
      aviso = null;
      marcar({ aviso: null, instalada: outcome === "accepted" });
      return outcome === "accepted";
    },
    descartar() {
      try {
        localStorage.setItem(DESCARTADO, "1");
      } catch {}
      marcar({ descartado: true });
    },
  };
}
