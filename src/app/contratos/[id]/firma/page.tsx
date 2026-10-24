"use client";

import { useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Aviso, Marco, Visto } from "@/components/contratos/Marco";
import { Button } from "@/components/ui";
import { diaCorto, equipoCorto, numeroContrato, planDe } from "@/lib/contratos";
import { cop, fecha, hora } from "@/lib/formato";
import { useRequerirRol } from "@/lib/store";
import { useContrato } from "@/lib/useContrato";
import { firmarContrato } from "@/server/contratos";
import type { Contrato } from "@/lib/types";

// La clienta firma en el celular del asesor. Sin código por SMS por ahora:
// acepta las condiciones y firma; se guardan fecha, hora y dispositivo.

const ANCHO = 358;
const ALTO = 168;

export default function FirmaPage() {
  const usuario = useRequerirRol(["staff", "admin"]);
  const { id } = useParams<{ id: string }>();
  const { contrato, error, ocupado, actuar } = useContrato(id);
  if (!usuario) return null;
  if (!contrato) {
    return error ? <Aviso titulo="No se pudo abrir el contrato" texto={error} /> : null;
  }
  if (contrato.firma === "digital") return <Firmado contrato={contrato} admin={usuario.rol === "admin"} />;
  if (contrato.anulado || contrato.firma === "papel") {
    return (
      <Aviso
        titulo={contrato.anulado ? "Este contrato fue anulado" : "Este contrato ya se firmó en papel"}
        accion={<Link className="es-btn es-btn--secondary es-btn--md" href={`/contratos/${contrato.id}`}>Volver al contrato</Link>}
      />
    );
  }
  return (
    <Firmar
      contrato={contrato}
      error={error}
      ocupado={ocupado}
      onFirmar={(trazo) => actuar(firmarContrato(contrato.id, trazo))}
    />
  );
}

function condiciones(c: Contrato): [string, string][] {
  const q = c.equipo;
  const equipo = [q.modelo, q.color.toLowerCase(), q.capacidad, q.estado].filter(Boolean).join(", ");
  const doc = `${c.tipo === "compraventa" ? "Compraventa" : "Acuerdo de pago"} ${numeroContrato(c)}, con Esmer Gómez Delgado (Esgode)`;
  if (c.tipo === "compraventa") {
    return [
      ["Documento", doc],
      ["Equipo", equipo],
      ["Recibes", `${cop(c.capital)} a la firma`],
      ["Declaras", "Que el equipo es tuyo, no es hurtado y no tiene bloqueos ni deudas con operadores"],
      ["Devolución", `Esgode puede pedir la devolución del dinero dentro de ${c.diasDevolucion ?? 30} días si el equipo falla`],
    ];
  }
  const plan = planDe(c, c.tasa, new Date(c.creadoEn));
  const pagar =
    c.forma === "cuotas"
      ? `${c.nCuotas} cuotas de ${cop(plan[0].valor)} en efectivo, del ${diaCorto(plan[0].fecha)} al ${diaCorto(plan[plan.length - 1].fecha)}`
      : `${cop(plan.reduce((a, p) => a + p.valor, 0))} en efectivo el ${diaCorto(plan[0].fecha)}`;
  return [
    ["Documento", doc],
    ["Equipo", equipo],
    ["Debes pagar", pagar],
    ["Intereses", c.conIntereses ? (c.forma === "cuotas" ? "Incluidos en cada cuota" : `${cop(plan[1]?.valor ?? 0)}, incluidos en el pago`) : "Ninguno mientras pagues a tiempo"],
    ["Si te atrasas", c.forma === "cuotas" ? "Se cobra interés de mora y Esgode puede exigir de una vez todo lo que falte" : "Se cobra interés de mora"],
  ];
}

function Firmar(props: { contrato: Contrato; error: string; ocupado: boolean; onFirmar: (trazo: string) => void }) {
  const c = props.contrato;
  const [acepto, setAcepto] = useState(false);
  const [trazos, setTrazos] = useState<[number, number][][]>([]);
  const dibujando = useRef(false);

  const punto = (e: PointerEvent<SVGSVGElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) * ANCHO) / r.width), Math.round(((e.clientY - r.top) * ALTO) / r.height)];
  };
  const d = trazos.map((t) => "M" + t.map((p) => `${p[0]} ${p[1]}`).join(" L")).join(" ");
  // Un toque sin arrastrar no cuenta como firma.
  const firmo = trazos.some((t) => t.length > 2);
  const listo = acepto && firmo;
  const falta = !acepto ? "Acepta las condiciones" : !firmo ? "Firma en el recuadro" : "Firmar contrato";

  return (
    <Marco
      grande
      titulo="Firma tu contrato"
      subtitulo={`${c.cliente.nombre.split(" ")[0]}, revisa las condiciones antes de firmar.`}
      pie={
        <>
          {props.error ? (
            <div className="callout text-danger-text" role="alert">
              {props.error}
            </div>
          ) : null}
          <Button size="lg" pill disabled={!listo || props.ocupado} onClick={() => props.onFirmar(d)}>
            {props.ocupado ? "Firmando…" : falta}
          </Button>
        </>
      }
    >
      <section className="es-card flex flex-col px-4 py-1">
        {condiciones(c).map(([k, v]) => (
          <div key={k} className="term">
            <span>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </section>
      <Link href={`/contratos/${c.id}/documento`} className="body -mt-2 font-semibold text-accent-text no-underline">
        Leer el contrato completo
      </Link>

      <button
        type="button"
        className={acepto ? "casilla casilla--on" : "casilla"}
        role="checkbox"
        aria-checked={acepto}
        onClick={() => setAcepto(!acepto)}
      >
        <Visto />
        <span>Leí el contrato y acepto sus condiciones.</span>
      </button>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="es-caption-label">Tu firma</div>
          <Button variant="plain" size="sm" disabled={!trazos.length} onClick={() => setTrazos([])}>
            Borrar
          </Button>
        </div>
        <div className="pad">
          <div className="pad__guia" />
          {trazos.length ? null : <div className="pad__ayuda">Firma aquí con el dedo</div>}
          <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            role="img"
            aria-label="Área para firmar"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dibujando.current = true;
              // El punto se lee aquí: React suelta el evento antes de aplicar el cambio de estado.
              const p = punto(e);
              setTrazos((t) => [...t, [p]]);
            }}
            onPointerMove={(e) => {
              if (!dibujando.current) return;
              const p = punto(e);
              setTrazos((t) => [...t.slice(0, -1), [...t[t.length - 1], p]]);
            }}
            onPointerUp={() => (dibujando.current = false)}
            onPointerCancel={() => (dibujando.current = false)}
          >
            <path d={d || "M0 0"} fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="footnote text-ink-secondary">
          Junto con tu firma guardamos la fecha, la hora y el dispositivo. En la firma electrónica no se pide huella.
        </div>
      </section>
    </Marco>
  );
}

function Firmado({ contrato: c, admin }: { contrato: Contrato; admin: boolean }) {
  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col items-center gap-4 px-6 pt-30 pb-8 text-center">
      <div className="flex size-18 items-center justify-center rounded-pill bg-success-soft text-success-text">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <h1 className="title-1 m-0">Contrato firmado</h1>
      <p className="body m-0 text-ink-secondary">
        Descarga el PDF firmado y compártelo con {c.cliente.trato === "sra" ? "la clienta" : "el cliente"} por WhatsApp o
        al correo {c.cliente.correo}.
      </p>
      <div className="es-card callout flex w-full flex-col gap-1 text-left text-ink-secondary">
        <div>
          <span className="font-semibold text-ink">Firmado:</span> {fecha(c.firmadoEn!)}, {hora(c.firmadoEn!)} · {c.firmaDispositivo}
        </div>
        <div>
          <span className="font-semibold text-ink">Equipo:</span> {equipoCorto(c.equipo)}
        </div>
        <div>
          <span className="font-semibold text-ink">Verificación del documento:</span>{" "}
          <span className="font-mono">{c.verificacion}</span>
        </div>
      </div>
      <div className="mt-auto flex w-full flex-col gap-3">
        <div className="callout text-ink-secondary">Devuelve el celular al asesor.</div>
        <Link href={`/contratos/${c.id}`} className="es-btn es-btn--primary es-btn--lg es-btn--pill">
          Descargar PDF firmado
        </Link>
        <Link href={admin ? "/admin/contratos" : "/contratos/nuevo"} className="es-btn es-btn--secondary es-btn--lg">
          {admin ? "Ir a contratos" : "Nuevo contrato"}
        </Link>
      </div>
    </div>
  );
}
