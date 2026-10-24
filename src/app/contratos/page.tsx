"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Marco } from "@/components/contratos/Marco";
import { Badge, SegmentedControl } from "@/components/ui";
import { ESTADOS, equipoCorto, estadoDe, numeroConSigla, tipoCorto } from "@/lib/contratos";
import { cop, fechaHora } from "@/lib/formato";
import { useRequerirRol } from "@/lib/store";
import { pedir } from "@/lib/useContrato";
import { listarContratos } from "@/server/contratos";
import type { Contrato, Etapa } from "@/lib/types";

// Contratos del staff en el celular: los borradores por terminar o en
// revisión, los aprobados por firmar y los firmados de las últimas dos semanas.

const GRUPOS: { value: Etapa; label: string; vacio: string }[] = [
  { value: "borrador", label: "Borradores", vacio: "No hay borradores. Empieza uno con «Nuevo contrato»." },
  { value: "aprobado", label: "Por firmar", vacio: "No hay contratos aprobados esperando firma." },
  { value: "firmado", label: "Firmados", vacio: "No hay contratos firmados en las últimas dos semanas." },
];

export default function MisContratosPage() {
  const usuario = useRequerirRol(["staff", "admin"]);
  const router = useRouter();
  const [contratos, setContratos] = useState<Contrato[] | null>(null);
  const [error, setError] = useState("");
  const [grupo, setGrupo] = useState<Etapa>("borrador");

  useEffect(() => {
    if (usuario?.rol === "admin") router.replace("/admin/contratos");
  }, [usuario, router]);
  useEffect(() => {
    if (usuario?.rol !== "staff") return;
    pedir(listarContratos())
      .then((r) => setContratos(r.contratos))
      .catch((e: Error) => setError(e.message));
  }, [usuario]);

  if (usuario?.rol !== "staff") return null;
  const lista = (contratos ?? []).filter((c) => c.etapa === grupo);
  const vacio = GRUPOS.find((g) => g.value === grupo)!.vacio;

  return (
    <Marco
      volver="/calculadora"
      volverLabel="Volver a la calculadora"
      titulo="Contratos"
      subtitulo="Borradores, por firmar y firmados recientes"
      extra={
        <SegmentedControl
          className="flex [&>button]:flex-1"
          label="Etapa"
          options={GRUPOS.map((g) => ({
            value: g.value,
            label: g.label,
            count: (contratos ?? []).filter((c) => c.etapa === g.value).length,
          }))}
          value={grupo}
          onChange={(v) => setGrupo(v as Etapa)}
        />
      }
      pie={
        <Link href="/contratos/nuevo" className="es-btn es-btn--primary es-btn--lg es-btn--pill">
          Nuevo contrato
        </Link>
      }
    >
      {error ? (
        <div className="callout text-danger-text" role="alert">
          {error}
        </div>
      ) : contratos && !lista.length ? (
        <div className="callout py-10 text-center text-ink-secondary">{vacio}</div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {lista.map((c) => {
            const estado = ESTADOS[estadoDe(c)];
            return (
              <li key={c.id}>
                <Link
                  href={`/contratos/${c.id}`}
                  className="es-card flex items-center justify-between gap-3 px-4 py-3 text-ink no-underline"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="headline truncate">{c.cliente.nombre || "Cliente sin nombre"}</span>
                    <span className="callout truncate text-ink-secondary">
                      {c.numero == null ? tipoCorto(c) : numeroConSigla(c)} · {equipoCorto(c.equipo) || "sin equipo"}
                    </span>
                    <span className="footnote text-ink-secondary">
                      {c.etapa === "borrador"
                        ? `Paso ${c.paso} de 4 · guardado ${fechaHora(c.editadoEn)}`
                        : `Editado ${fechaHora(c.editadoEn)}`}
                    </span>
                  </span>
                  <span className="flex flex-none flex-col items-end gap-1">
                    {c.capital ? <span className="data">{cop(c.capital)}</span> : null}
                    <Badge tone={estado.tono}>{estado.nombre}</Badge>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Marco>
  );
}
