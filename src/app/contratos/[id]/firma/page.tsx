"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Aviso, Marco, Visto } from "@/components/contratos/Marco";
import { Wordmark } from "@/components/Mark";
import { Button } from "@/components/ui";
import { diaCorto, equipoCorto, fechaDocumento, numeroContrato, planDe } from "@/lib/contratos";
import { cop, fecha, hora } from "@/lib/formato";
import { useRequerirRol } from "@/lib/store";
import { useContrato } from "@/lib/useContrato";
import { firmarContrato } from "@/server/contratos";
import type { Contrato } from "@/lib/types";

// La clienta firma en el celular del asesor. Sin código por SMS: acepta las
// condiciones y firma en un recuadro a pantalla completa, en horizontal. Se
// guardan la fecha, la hora y el dispositivo.

/** Lienzo de la firma en horizontal (unidades del SVG). */
const ANCHO = 800;
const ALTO = 260;

export default function FirmaPage() {
  const usuario = useRequerirRol(["staff", "admin"]);
  const { id } = useParams<{ id: string }>();
  const { contrato, error, ocupado, actuar } = useContrato(id);
  if (!usuario) return null;
  if (!contrato) {
    return error ? <Aviso titulo="No se pudo abrir el contrato" texto={error} /> : null;
  }
  if (contrato.firma === "digital") return <Firmado contrato={contrato} admin={usuario.rol === "admin"} />;
  if (contrato.anulado || contrato.etapa !== "aprobado") {
    return (
      <Aviso
        titulo={
          contrato.anulado
            ? "Este contrato fue anulado"
            : contrato.etapa === "borrador"
              ? "Este contrato aún no está aprobado"
              : "Este contrato ya se firmó en papel"
        }
        texto={
          contrato.etapa === "borrador" && !contrato.anulado
            ? "Administración tiene que aprobarlo antes de firmarlo."
            : undefined
        }
        accion={
          <Link className="es-btn es-btn--secondary es-btn--md" href={`/contratos/${contrato.id}`}>
            Volver al contrato
          </Link>
        }
      />
    );
  }
  return (
    <Firmar
      contrato={contrato}
      error={error}
      ocupado={ocupado}
      onFirmar={(trazo) => actuar(firmarContrato(contrato.id, trazo, `${ANCHO} ${ALTO}`))}
    />
  );
}

function condiciones(c: Contrato): [string, string][] {
  const q = c.equipo;
  const equipo = [q.modelo, q.color.toLowerCase(), q.capacidad, q.estado].filter(Boolean).join(", ");
  const quien = c.acreedor === "elex" ? "ELEX COMPANY SAS (Esgode)" : "Esmer Gómez Delgado (Esgode)";
  const doc = `${c.tipo === "compraventa" ? "Compraventa" : "Acuerdo de pago"} ${numeroContrato(c)}, con ${quien}`;
  if (c.tipo === "compraventa") {
    return [
      ["Documento", doc],
      ["Equipo", equipo],
      ["Recibes", `${cop(c.capital)} a la firma`],
      ["Declaras", "Que el equipo es tuyo, no es hurtado y no tiene bloqueos ni deudas con operadores"],
      [
        "Devolución",
        `Esgode puede pedir la devolución del dinero dentro de ${c.diasDevolucion ?? 30} días si el equipo falla`,
      ],
    ];
  }
  const plan = planDe(c, c.tasa, fechaDocumento(c));
  const cada = { mensual: "", quincenal: " quincenales", semanal: " semanales" }[c.periodo];
  const pagar =
    c.forma === "cuotas"
      ? `${c.nCuotas} cuotas${cada} de ${cop(plan[0].valor)} en efectivo, del ${diaCorto(plan[0].fecha)} al ${diaCorto(plan[plan.length - 1].fecha)}`
      : `${cop(plan.reduce((a, p) => a + p.valor, 0))} en efectivo el ${diaCorto(plan[0].fecha)}`;
  return [
    ["Documento", doc],
    ["Equipo", equipo],
    ["Debes pagar", pagar],
    [
      "Intereses",
      c.conIntereses
        ? c.forma === "cuotas"
          ? "Incluidos en cada cuota"
          : `${cop(plan[1]?.valor ?? 0)}, incluidos en el pago`
        : "Ninguno mientras pagues a tiempo",
    ],
    [
      "Si te atrasas",
      c.forma === "cuotas"
        ? "Se cobra interés de mora y Esgode puede exigir de una vez todo lo que falte"
        : "Se cobra interés de mora",
    ],
  ];
}

type Punto = [number, number];

/** En vertical el celular no se puede girar solo: el recuadro se gira 90° con CSS. */
const enVertical = () => typeof window !== "undefined" && window.innerHeight > window.innerWidth;

async function pantallaCompleta(entrar: boolean) {
  try {
    if (entrar) {
      await document.documentElement.requestFullscreen?.();
      // Android lo permite en pantalla completa; iPhone no: ahí queda el giro por CSS.
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
    } else {
      screen.orientation?.unlock?.();
      if (document.fullscreenElement) await document.exitFullscreen();
    }
  } catch {
    // Sin permiso: se firma con el giro por CSS.
  }
}

function HojaFirma(props: {
  nombre: string;
  ocupado: boolean;
  error: string;
  onCancelar: () => void;
  onFirmar: (trazo: string) => void;
}) {
  const [trazos, setTrazos] = useState<Punto[][]>([]);
  const [rotada, setRotada] = useState(enVertical);
  const dibujando = useRef(false);
  const lienzo = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const medir = () => setRotada(enVertical());
    pantallaCompleta(true).then(medir);
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("resize", medir);
      pantallaCompleta(false);
    };
  }, []);

  // Sin desplazamiento ni zoom del navegador mientras se dibuja (listeners nativos, no pasivos).
  const refLienzo = useCallback((el: SVGSVGElement | null) => {
    const parar = (e: Event) => e.cancelable && e.preventDefault();
    const tipos = ["touchstart", "touchmove", "gesturestart"];
    if (lienzo.current) tipos.forEach((t) => lienzo.current!.removeEventListener(t, parar));
    lienzo.current = el;
    if (el) tipos.forEach((t) => el.addEventListener(t, parar, { passive: false }));
  }, []);

  const punto = (e: PointerEvent<SVGSVGElement>): Punto => {
    const r = e.currentTarget.getBoundingClientRect();
    // Girado 90°: el eje x del lienzo corre hacia abajo en la pantalla y el eje y hacia la izquierda.
    if (rotada)
      return [
        Math.round(((e.clientY - r.top) * ANCHO) / r.height),
        Math.round(((r.right - e.clientX) * ALTO) / r.width),
      ];
    return [Math.round(((e.clientX - r.left) * ANCHO) / r.width), Math.round(((e.clientY - r.top) * ALTO) / r.height)];
  };
  const d = trazos.map((t) => "M" + t.map((p) => `${p[0]} ${p[1]}`).join(" L")).join(" ");
  // Un toque sin arrastrar no cuenta como firma.
  const firmo = trazos.some((t) => t.length > 2);

  return (
    <div className="firma-hoja" role="dialog" aria-modal="true" aria-label="Firma en horizontal">
      <div className={rotada ? "firma-giro firma-giro--rotada" : "firma-giro"}>
        <div className="flex items-center justify-between gap-3 px-6 pt-3.5 pb-2.5">
          <div className="flex min-w-0 items-baseline gap-3">
            <div className="title-3">Firma aquí</div>
            <div className="callout truncate text-ink-secondary">Firma con el dedo dentro del recuadro</div>
          </div>
          <Button variant="plain" size="sm" disabled={!trazos.length || props.ocupado} onClick={() => setTrazos([])}>
            Borrar
          </Button>
        </div>
        <div className="firma-lienzo">
          <div className="firma-lienzo__base" />
          <div className="firma-lienzo__x">×</div>
          {trazos.length ? null : <div className="firma-lienzo__nombre">{props.nombre}</div>}
          <svg
            ref={refLienzo}
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            preserveAspectRatio="none"
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
              setTrazos((t) => {
                const ultimo = t[t.length - 1];
                const q = ultimo[ultimo.length - 1];
                // Puntos casi iguales no cambian el trazo y agrandan la firma guardada.
                if (Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < 2) return t;
                return [...t.slice(0, -1), [...ultimo, p]];
              });
            }}
            onPointerUp={() => (dibujando.current = false)}
            onPointerCancel={() => (dibujando.current = false)}
          >
            <path
              d={d || "M0 0"}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pt-2.5 pb-3.5">
          {props.error ? (
            <div className="callout mr-auto text-danger-text" role="alert">
              {props.error}
            </div>
          ) : null}
          <Button
            variant="secondary"
            size="lg"
            className="min-w-35"
            disabled={props.ocupado}
            onClick={props.onCancelar}
          >
            Cancelar
          </Button>
          <Button
            size="lg"
            pill
            className="min-w-50"
            disabled={!firmo || props.ocupado}
            onClick={() => props.onFirmar(d)}
          >
            {props.ocupado ? "Firmando…" : "Firmar contrato"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Firmar(props: { contrato: Contrato; error: string; ocupado: boolean; onFirmar: (trazo: string) => void }) {
  const c = props.contrato;
  const [acepto, setAcepto] = useState(false);
  const [abierta, setAbierta] = useState(false);

  return (
    <>
      <Marco
        grande
        arriba={<Wordmark height={24} className="mb-1" />}
        titulo="Firma tu contrato"
        subtitulo={`${c.cliente.nombre.split(" ")[0]}, revisa las condiciones antes de firmar.`}
        pie={
          <>
            {props.error && !abierta ? (
              <div className="callout text-danger-text" role="alert">
                {props.error}
              </div>
            ) : null}
            <Button size="lg" pill disabled={!acepto} onClick={() => setAbierta(true)}>
              {acepto ? "Firmar contrato" : "Acepta las condiciones"}
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

        <div className="footnote text-ink-secondary">
          Al tocar «Firmar contrato» se abre el recuadro de firma en horizontal, a pantalla completa. Junto con tu firma
          guardamos la fecha, la hora y el dispositivo. En la firma electrónica no se pide huella.
        </div>
      </Marco>
      {abierta ? (
        <HojaFirma
          nombre={c.cliente.nombre}
          ocupado={props.ocupado}
          error={props.error}
          onCancelar={() => setAbierta(false)}
          onFirmar={props.onFirmar}
        />
      ) : null}
    </>
  );
}

function Firmado({ contrato: c, admin }: { contrato: Contrato; admin: boolean }) {
  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col items-center gap-4 px-6 pt-30 pb-8 text-center">
      <div className="flex size-18 items-center justify-center rounded-pill bg-success-soft text-success-text">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <h1 className="title-1 m-0">Contrato firmado</h1>
      <p className="body m-0 text-ink-secondary">
        Descarga el PDF firmado y compártelo con {c.cliente.trato === "sra" ? "la clienta" : "el cliente"} por WhatsApp
        o al correo {c.cliente.correo}.
      </p>
      <div className="es-card callout flex w-full flex-col gap-1 text-left text-ink-secondary">
        <div>
          <span className="font-semibold text-ink">Firmado:</span> {fecha(c.firmadoEn!)}, {hora(c.firmadoEn!)} ·{" "}
          {c.firmaDispositivo}
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
          Ver contrato firmado y descargar PDF
        </Link>
        <Link href={admin ? "/admin/contratos" : "/contratos/nuevo"} className="es-btn es-btn--secondary es-btn--lg">
          {admin ? "Ir a contratos" : "Nuevo contrato"}
        </Link>
      </div>
    </div>
  );
}
