"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Documento, hojasDe } from "@/components/contratos/Documento";
import { Aviso } from "@/components/contratos/Marco";
import { Button, Icon } from "@/components/ui";
import { COPIAS, codigoContrato, copiaInfo, numeroContrato } from "@/lib/contratos";
import { useRequerirRol } from "@/lib/store";
import { pedir, useContrato } from "@/lib/useContrato";
import { registrarDescarga } from "@/server/contratos";
import type { Contrato, Copia } from "@/lib/types";

// El PDF sale de la impresión del navegador («Guardar como PDF»): las hojas
// ya tienen el tamaño carta. ?copias=original,cartera elige las copias y
// ?archivo=uno imprime todas juntas al abrir; con ?archivo=cada se guarda una
// por una. Sin consulta, solo se ve el original. Antes de imprimir se espera a
// que carguen las fotos del anexo. El PDF del borrador no queda en el historial.

/** Espera a que terminen de cargar las imágenes de las hojas (máximo 8 s). */
function fotosCargadas(): Promise<void> {
  const pendientes = [...document.querySelectorAll<HTMLImageElement>(".doc-paginas img")].filter(
    (img) => !img.complete,
  );
  const todas = Promise.all(
    pendientes.map(
      (img) =>
        new Promise((ok) => {
          img.addEventListener("load", ok, { once: true });
          img.addEventListener("error", ok, { once: true });
        }),
    ),
  );
  return Promise.race([todas.then(() => {}), new Promise<void>((ok) => setTimeout(ok, 8000))]);
}

export default function DocumentoPage() {
  const usuario = useRequerirRol(["staff", "admin"]);
  const { id } = useParams<{ id: string }>();
  const consulta = useSearchParams();
  const { contrato, error } = useContrato(id);
  if (!usuario) return null;
  if (!contrato) return error ? <Aviso titulo="No se pudo abrir el contrato" texto={error} /> : null;
  const pedidas = (consulta.get("copias") ?? "").split(",").filter((c): c is Copia => COPIAS.includes(c as Copia));
  const archivo = consulta.get("archivo");
  return (
    <Hojas
      contrato={contrato}
      copias={pedidas.length ? pedidas : ["original"]}
      modo={!pedidas.length ? "ver" : archivo === "cada" ? "cada" : "uno"}
    />
  );
}

function Hojas({ contrato: c, copias, modo }: { contrato: Contrato; copias: Copia[]; modo: "ver" | "uno" | "cada" }) {
  const hojas = hojasDe(c);
  const [escala, setEscala] = useState(1);
  const [imprimiendo, setImprimiendo] = useState<Copia[] | null>(null);
  const [guardadas, setGuardadas] = useState<Copia[]>([]);
  const [fallo, setFallo] = useState("");
  const auto = useRef(false);

  // En celular las hojas se reducen al ancho de la pantalla; al imprimir, tamaño real.
  useEffect(() => {
    const ajustar = () => setEscala(Math.min(1, (window.innerWidth - 32) / 816));
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  // Imprime cuando las hojas de las copias elegidas ya están en pantalla.
  useEffect(() => {
    if (!imprimiendo) return;
    const titulo = document.title;
    const borrador = c.etapa === "borrador";
    document.title = borrador
      ? `Borrador ${c.cliente.nombre}`.trim()
      : `${codigoContrato(c)} ${imprimiendo.length === 1 ? copiaInfo(imprimiendo[0], c.tipo).nombre.split(" · ")[1] : "copias"}`;
    if (!borrador)
      pedir(registrarDescarga(c.id, imprimiendo)).catch((e: Error) =>
        setFallo(`El PDF se generó, pero no quedó en el historial: ${e.message}`),
      );
    let vigente = true;
    const t = setTimeout(async () => {
      await fotosCargadas();
      if (!vigente) return;
      window.print();
      document.title = titulo;
      setGuardadas((g) => [...new Set([...g, ...imprimiendo])]);
      setImprimiendo(null);
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [imprimiendo, c]);

  useEffect(() => {
    if (modo === "uno" && !auto.current) {
      auto.current = true;
      setImprimiendo(copias);
    }
  }, [modo, copias]);

  // Al imprimir solo salen las copias de esta descarga; en pantalla se ven todas.
  const visibles = imprimiendo ?? copias;

  return (
    <div className="doc-impresion min-h-dvh bg-surface-sunken">
      <header className="no-imprimir sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-hairline bg-surface px-4 py-3">
        <Link
          href={`/contratos/${c.id}`}
          aria-label="Volver al contrato"
          className="inline-flex size-9 flex-none items-center justify-center rounded-md text-accent-text"
        >
          <Icon name="chevron" size="lg" className="rotate-180" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="headline truncate">
            {c.etapa === "borrador" ? "Borrador · " : ""}
            {c.tipo === "compraventa" ? "Compraventa" : "Acuerdo de pago"}{" "}
            {c.etapa === "borrador" ? "" : numeroContrato(c)}
          </div>
          <div className="callout text-ink-secondary">
            {modo === "ver"
              ? `Original · ${hojas.length} ${hojas.length === 1 ? "página" : "páginas"}`
              : "En la ventana de impresión, elige «Guardar como PDF»."}
          </div>
        </div>
        {modo === "ver" ? (
          <Link href={`/contratos/${c.id}`} className="es-btn es-btn--primary es-btn--md">
            {c.etapa === "borrador" ? "Volver a la revisión" : "Descargar PDF"}
          </Link>
        ) : modo === "uno" ? (
          <Button onClick={() => setImprimiendo(copias)}>Guardar PDF</Button>
        ) : null}
        {modo === "cada" ? (
          <div className="flex w-full flex-wrap gap-2">
            {copias.map((k) => (
              <Button
                key={k}
                variant={guardadas.includes(k) ? "secondary" : "tinted"}
                size="sm"
                icon={guardadas.includes(k) ? "check" : undefined}
                onClick={() => setImprimiendo([k])}
              >
                {copiaInfo(k, c.tipo).nombre}
              </Button>
            ))}
          </div>
        ) : null}
        {fallo ? (
          <div className="callout w-full text-danger-text" role="alert">
            {fallo}
          </div>
        ) : null}
      </header>

      <div className="doc doc-paginas flex flex-col items-center gap-8 px-4 py-6" style={{ zoom: escala }}>
        {COPIAS.filter((k) => copias.includes(k)).map((k) => (
          <Documento key={k} contrato={c} copia={k} hojas={hojas} oculta={!visibles.includes(k)} />
        ))}
      </div>
    </div>
  );
}
