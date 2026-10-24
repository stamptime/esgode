"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { Documento, hojasDe } from "@/components/contratos/Documento";
import { FotoHueco } from "@/components/contratos/Fotos";
import { Aviso, Marco, Opcion, Visto } from "@/components/contratos/Marco";
import { Badge, Button, Icon, SegmentedControl, Toggle } from "@/components/ui";
import {
  COPIAS,
  ESTADOS,
  ETAPAS,
  copiaInfo,
  estadoDe,
  indiceEtapa,
  nombrePlantilla,
  numeroContrato,
} from "@/lib/contratos";
import { fechaHora, hora } from "@/lib/formato";
import { subirFoto } from "@/lib/fotos";
import { useRequerirRol } from "@/lib/store";
import { pedir, useContrato } from "@/lib/useContrato";
import { aprobarContrato, eliminarBorrador, volverABorrador } from "@/server/contratos";
import type { Contrato, Copia, Usuario } from "@/lib/types";

// Revisión, aprobación y firma. El borrador se revisa con la marca BORRADOR y
// se envía a revisión; administración lo aprueba (se asigna el número y se
// bloquea); se firma en el celular o en papel. Las evidencias de entrega se
// agregan desde la aprobación en adelante.

const ESPERA_MS = 15_000;
const MAX_ENTREGAS = 12;

export default function ContratoPage() {
  const usuario = useRequerirRol(["staff", "admin"]);
  const { id } = useParams<{ id: string }>();
  const estado = useContrato(id);
  if (!usuario) return null;
  const volver = usuario.rol === "admin" ? "/admin/contratos" : "/contratos";
  if (!estado.contrato) {
    return estado.error ? (
      <Aviso
        titulo="No se pudo abrir el contrato"
        texto={estado.error}
        accion={
          <Link className="es-btn es-btn--secondary es-btn--md" href={volver}>
            Volver
          </Link>
        }
      />
    ) : null;
  }
  return <Revision {...estado} contrato={estado.contrato} usuario={usuario} volver={volver} />;
}

function IconoNota({ tipo }: { tipo: "lapiz" | "candado" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {tipo === "lapiz" ? (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </>
      ) : (
        <>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      )}
    </svg>
  );
}

function Hecho({ texto }: { texto: string }) {
  return (
    <div className="callout flex items-center gap-1.5 text-success-text" role="status">
      <Icon name="check" />
      {texto}
    </div>
  );
}

/** Tarjeta con dos acciones: WhatsApp y descargar el PDF. */
function Compartir(props: {
  titulo: string;
  texto: string;
  whatsapp: string;
  pdf: string;
  aviso: string;
  onAviso: (t: string) => void;
}) {
  return (
    <section className="es-card flex flex-col gap-2.5 px-4 py-3.5" aria-label={props.titulo}>
      <div className="flex flex-col gap-0.5">
        <div className="headline">{props.titulo}</div>
        <div className="callout text-ink-secondary">{props.texto}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a
          className="es-btn es-btn--secondary es-btn--md"
          href={props.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => props.onAviso(`Abierto en WhatsApp · ${hora(new Date().toISOString())}`)}
        >
          <Icon name="whatsapp" />
          WhatsApp
        </a>
        <Link className="es-btn es-btn--secondary es-btn--md" href={props.pdf}>
          Descargar PDF
        </Link>
      </div>
      {props.aviso ? <Hecho texto={props.aviso} /> : null}
    </section>
  );
}

/** Una hoja del PDF a la vez, ajustada al ancho o a tamaño real. */
function Visor({ contrato }: { contrato: Contrato }) {
  const hojas = hojasDe(contrato);
  const [pagina, setPagina] = useState(0);
  const [zoom, setZoom] = useState<"ajustar" | "100">("ajustar");
  const [ancho, setAncho] = useState(334);
  const caja = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth - 24);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const total = hojas.length;
  const actual = Math.min(pagina, total - 1);
  const k = zoom === "100" ? 1 : ancho / 816;
  return (
    <section className="es-card flex flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b border-hairline py-2 pr-2 pl-3.5">
        <span className="callout font-semibold">
          Página {actual + 1} de {total}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="plain"
            size="sm"
            icon="chevron"
            label="Página anterior"
            className="-scale-x-100"
            disabled={actual <= 0}
            onClick={() => setPagina(actual - 1)}
          />
          <Button
            variant="plain"
            size="sm"
            icon="chevron"
            label="Página siguiente"
            disabled={actual >= total - 1}
            onClick={() => setPagina(actual + 1)}
          />
          <SegmentedControl
            label="Zoom"
            options={[
              { value: "ajustar", label: "Ajustar" },
              { value: "100", label: "100 %" },
            ]}
            value={zoom}
            onChange={(v) => setZoom(v as "ajustar" | "100")}
          />
        </div>
      </div>
      <div ref={caja} className="visor" role="document" aria-label="Vista previa del PDF">
        <div
          className="relative mx-auto overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,.4)]"
          style={{ width: Math.round(816 * k), height: Math.round(1056 * k) }}
        >
          <div
            className="doc pointer-events-none absolute top-0 left-0 w-[816px] origin-top-left"
            style={{ transform: `scale(${k})` }}
          >
            <Documento contrato={contrato} copia="original" hojas={hojas} solo={actual} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Revision(props: {
  contrato: Contrato;
  setContrato: (c: Contrato) => void;
  usuario: Usuario;
  volver: string;
  error: string;
  setError: (e: string) => void;
  ocupado: boolean;
  actuar: (accion: Promise<{ ok: true; contrato: Contrato } | { ok: false; error: string }>) => Promise<boolean>;
  recargar: () => void;
}) {
  const { contrato: c, usuario, recargar } = props;
  const router = useRouter();
  const admin = usuario.rol === "admin";
  const [modo, setModo] = useState<"digital" | "papel">("digital");
  const [sel, setSel] = useState<Record<Copia, boolean>>({
    original: true,
    contabilidad: true,
    tienda: true,
    gerencia: true,
  });
  const [porArchivo, setPorArchivo] = useState(false);
  const [aviso, setAviso] = useState("");
  const [subiendo, setSubiendo] = useState<"entrega" | "firmado" | null>(null);
  const [confirmar, setConfirmar] = useState<"borrador" | "eliminar" | null>(null);

  const etapa = c.anulado ? null : c.etapa;
  const borrador = etapa === "borrador";
  const aprobado = etapa === "aprobado";
  const firmado = etapa === "firmado";
  const papel = modo === "papel";
  const ella = c.cliente.trato === "sra";
  const clienta = ella ? "la clienta" : "el cliente";
  const estado = ESTADOS[estadoDe(c)];
  const idx = indiceEtapa(c);
  const nombreDoc = c.tipo === "compraventa" ? "Compraventa" : "Acuerdo de pago";

  // El staff espera la aprobación: se vuelve a consultar cada poco.
  useEffect(() => {
    if (!borrador || admin) return;
    const t = setInterval(recargar, ESPERA_MS);
    return () => clearInterval(t);
  }, [borrador, admin, recargar]);

  const elegidas = COPIAS.filter((k) => sel[k]);
  const n = elegidas.length;
  const muestraCopias = (aprobado && papel) || firmado;
  const cel = c.cliente.cel.replace(/\D/g, "");
  const primerNombre = c.cliente.nombre.split(" ")[0] || "";
  const enlace = typeof window === "undefined" ? "" : `${window.location.origin}/contratos/${c.id}`;
  const waRevision = `https://wa.me/?text=${encodeURIComponent(
    `Borrador para revisión: ${nombrePlantilla(c).toLowerCase()} de ${c.cliente.nombre || "cliente sin nombre"}. Ábrelo para revisarlo y aprobarlo: ${enlace}`,
  )}`;
  const waCliente = (texto: string) => `https://wa.me/57${cel}?text=${encodeURIComponent(texto)}`;
  const pdf = (copias: Copia[], cada = false) =>
    `/contratos/${c.id}/documento?copias=${copias.join(",")}&archivo=${cada ? "cada" : "uno"}`;

  async function subir(hueco: "entrega" | "firmado", archivo: File) {
    setSubiendo(hueco);
    props.setError("");
    try {
      props.setContrato(await subirFoto(c.id, hueco, archivo));
    } catch (e) {
      props.setError((e as Error).message);
    } finally {
      setSubiendo(null);
    }
  }

  async function eliminar() {
    setConfirmar(null);
    try {
      await pedir<object>(eliminarBorrador(c.id));
      router.push(props.volver);
    } catch (e) {
      props.setError((e as Error).message);
    }
  }

  let pie: ReactNode = null;
  if (borrador) {
    pie = admin ? (
      <Button
        size="lg"
        pill
        icon="check"
        className="flex-1"
        disabled={props.ocupado}
        onClick={() => props.actuar(aprobarContrato(c.id))}
      >
        {props.ocupado ? "Aprobando…" : "Aprobar · listo para firmar"}
      </Button>
    ) : (
      <div className="callout rounded-lg bg-surface-sunken px-4 py-3 text-center text-ink-secondary" role="status">
        Esperando la aprobación de administración. Esta pantalla se actualiza sola.
      </div>
    );
  } else if (aprobado && !papel) {
    pie = (
      <Link href={`/contratos/${c.id}/firma`} className="es-btn es-btn--primary es-btn--lg es-btn--pill">
        Pasar el celular a {clienta}
      </Link>
    );
  } else if (muestraCopias) {
    pie = (
      <Link
        href={pdf(elegidas, porArchivo && n > 1)}
        aria-disabled={n === 0}
        className={
          n === 0
            ? "es-btn es-btn--primary es-btn--lg es-btn--pill pointer-events-none opacity-40"
            : "es-btn es-btn--primary es-btn--lg es-btn--pill"
        }
      >
        {n === 0 ? "Elige al menos una copia" : porArchivo && n > 1 ? `Descargar ${n} PDF` : "Descargar PDF"}
      </Link>
    );
  }

  const entregas = c.fotos.entregas ?? [];

  return (
    <Marco
      volver={props.volver}
      volverLabel="Volver a contratos"
      titulo={
        c.anulado
          ? "Contrato anulado"
          : borrador
            ? "Revisión del contrato"
            : aprobado
              ? "Listo para firmar"
              : "Contrato firmado"
      }
      subtitulo={borrador ? `${nombreDoc} · borrador sin número` : `${nombreDoc} ${numeroContrato(c)}`}
      lado={<Badge tone={estado.tono}>{c.anulado ? "Anulado" : ETAPAS[idx]}</Badge>}
      extra={
        <div className="etapas" aria-label={`Etapa: ${ETAPAS[idx]}`}>
          {ETAPAS.map((t, i) => (
            <div key={t} className={i < idx ? "etapa etapa--hecha" : i === idx ? "etapa etapa--actual" : "etapa"}>
              <i />
              <span>{t}</span>
            </div>
          ))}
        </div>
      }
      pie={
        props.error || pie ? (
          <>
            {props.error ? (
              <div className="callout text-danger-text" role="alert">
                {props.error}
              </div>
            ) : null}
            {pie}
          </>
        ) : undefined
      }
    >
      {c.anulado ? (
        <div className="nota nota--bloqueo" role="status">
          <IconoNota tipo="candado" />
          <span>
            <b>Anulado.</b> {c.motivoAnulacion ? `Motivo: ${c.motivoAnulacion}.` : ""} Queda en el historial; ya no se
            firma ni se registran pagos.
          </span>
        </div>
      ) : borrador ? (
        <div className="nota nota--info" role="status">
          <IconoNota tipo="lapiz" />
          <span>
            <b>Borrador en revisión.</b> Revisa el documento y corrige lo que haga falta. Mientras sea borrador no se
            puede firmar y el PDF lleva la marca BORRADOR.
          </span>
        </div>
      ) : aprobado ? (
        <div className="nota nota--bloqueo" role="status">
          <IconoNota tipo="candado" />
          <span>
            <b>
              Aprobado por {c.aprobadoPor}, {fechaHora(c.aprobadoEn!)}.
            </b>{" "}
            El contenido está bloqueado. Si hay que corregir algo, vuélvelo a borrador: se pierde la aprobación y hay
            que aprobarlo otra vez.
          </span>
        </div>
      ) : (
        <div className="nota nota--bloqueo" role="status">
          <IconoNota tipo="candado" />
          <span>
            <b>
              Firmado {c.firma === "digital" ? "en el celular" : "en papel"} el {fechaHora(c.firmadoEn!)}.
            </b>{" "}
            Este contrato ya no se puede modificar. Puedes descargarlo, agregar evidencias de entrega
            {admin ? " y registrar pagos" : ""}.
          </span>
        </div>
      )}

      {(aprobado || firmado) && !c.anulado ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <div className="es-caption-label">
              {c.tipo === "compraventa" ? "Evidencia de recepción del equipo" : "Evidencia de entrega del equipo"}
            </div>
            <span className="footnote text-ink-secondary">
              {entregas.length
                ? `${entregas.length} ${entregas.length === 1 ? "foto" : "fotos"} en el contrato`
                : "Se agrega al contrato"}
            </span>
          </div>
          <div className="fotos fotos--3">
            {entregas.map((f, i) => (
              <FotoHueco key={f.archivo} contratoId={c.id} titulo={`Entrega ${i + 1}`} foto={f} forma="pequena" />
            ))}
            {entregas.length < MAX_ENTREGAS ? (
              <FotoHueco
                contratoId={c.id}
                titulo="Tomar foto"
                forma="pequena"
                ocupado={subiendo === "entrega"}
                onElegir={(f) => subir("entrega", f)}
              />
            ) : null}
          </div>
          <div className="footnote text-ink-secondary">
            {firmado
              ? "Las fotos nuevas se agregan al anexo de evidencias con fecha, hora y autor. El contrato firmado no cambia."
              : "Las fotos van al anexo de evidencias fotográficas del contrato."}
          </div>
        </section>
      ) : null}

      <Visor contrato={c} />

      {borrador ? (
        <>
          <Compartir
            titulo="Enviar a revisión"
            texto="Comparte el borrador con quien lo debe revisar. El PDF lleva la marca BORRADOR · NO VÁLIDO y no sirve para firmar."
            whatsapp={waRevision}
            pdf={pdf(["original"])}
            aviso={aviso}
            onAviso={setAviso}
          />
          <Link href={`/contratos/nuevo?borrador=${c.id}`} className="es-btn es-btn--secondary es-btn--lg">
            Editar datos del contrato
          </Link>
          {c.numero == null ? (
            <Button
              variant="plain"
              size="sm"
              className="self-center text-danger-text"
              onClick={() => setConfirmar("eliminar")}
            >
              Eliminar borrador
            </Button>
          ) : null}
        </>
      ) : null}

      {aprobado ? (
        <>
          <section className="flex flex-col gap-2">
            <div className="es-caption-label">¿Cómo se firma?</div>
            <div role="radiogroup" aria-label="Forma de firma" className="flex flex-col gap-2">
              <Opcion
                on={!papel}
                titulo="Firmar en el celular"
                texto={`${ella ? "La clienta" : "El cliente"} lee las condiciones, las acepta y firma en la pantalla. Se guardan la fecha, la hora y el dispositivo.`}
                onClick={() => setModo("digital")}
              />
              <Opcion
                on={papel}
                titulo="Firmar en papel"
                texto="Descarga el PDF con recuadro para la huella, imprímelo y, cuando esté firmado, sube la foto del original."
                onClick={() => setModo("papel")}
              />
            </div>
          </section>
          <Compartir
            titulo="Compartir sin firmar"
            texto={`Contrato aprobado con su número, sin marca de borrador y con los espacios de firma en blanco. Sirve para que ${clienta} lo lea antes de firmar.`}
            whatsapp={waCliente(
              `Hola ${primerNombre}, te escribimos de Esgode. Te compartimos tu ${nombrePlantilla(c).toLowerCase()} ${numeroContrato(c)} para que lo leas antes de firmar.`,
            )}
            pdf={pdf(["original"])}
            aviso={aviso}
            onAviso={setAviso}
          />
          <Button
            variant="plain"
            size="md"
            className="self-start"
            disabled={props.ocupado}
            onClick={() => setConfirmar("borrador")}
          >
            Volver a borrador para corregir
          </Button>
        </>
      ) : null}

      {muestraCopias ? (
        <>
          <section className="es-card flex flex-col px-4 pt-1 pb-3">
            <div className="flex items-center justify-between pt-3 pb-1">
              <div className="es-caption-label">Incluir en el PDF</div>
              <span className="callout text-ink-secondary">
                {n} {n === 1 ? "copia" : "copias"} · {n * hojasDe(c).length} páginas
              </span>
            </div>
            <div role="group" aria-label="Copias incluidas en el PDF">
              {COPIAS.map((k) => {
                const info = copiaInfo(k, c.tipo);
                return (
                  <button
                    key={k}
                    type="button"
                    className={sel[k] ? "casilla casilla--fila casilla--on" : "casilla casilla--fila"}
                    role="checkbox"
                    aria-checked={sel[k]}
                    onClick={() => setSel({ ...sel, [k]: !sel[k] })}
                  >
                    <Visto />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="headline">{info.nombre}</span>
                      <span className="callout text-ink-secondary">
                        {k === "original" ? `El que recibe ${clienta}.` : info.para}
                      </span>
                    </span>
                    <span className="banda">{info.banda}</span>
                  </button>
                );
              })}
            </div>
            <div className="pt-3">
              <Toggle label="Un archivo por copia" checked={porArchivo} onChange={setPorArchivo} />
            </div>
          </section>
          {firmado ? (
            <a
              className="es-btn es-btn--secondary es-btn--lg"
              href={waCliente(
                `Hola ${primerNombre}, te escribimos de Esgode. Te compartimos tu ${nombrePlantilla(c).toLowerCase()} ${numeroContrato(c)} firmado.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="whatsapp" />
              Compartir original por WhatsApp
            </a>
          ) : null}
        </>
      ) : null}

      {aprobado && papel ? (
        <label
          className={
            subiendo === "firmado"
              ? "es-btn es-btn--tinted es-btn--lg relative opacity-60"
              : "es-btn es-btn--tinted es-btn--lg relative cursor-pointer"
          }
        >
          <input
            className="absolute size-px opacity-0"
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            disabled={subiendo === "firmado"}
            aria-label="Subir foto del original firmado"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) subir("firmado", f);
            }}
          />
          {subiendo === "firmado" ? "Subiendo…" : "Subir original firmado y marcar como firmado"}
        </label>
      ) : null}

      {firmado && c.fotos.firmado ? (
        <section className="flex flex-col gap-2">
          <div className="es-caption-label">Original firmado en papel</div>
          <div className="w-40">
            <FotoHueco contratoId={c.id} titulo="Original firmado" foto={c.fotos.firmado} forma="cuadrada" />
          </div>
        </section>
      ) : null}

      <ConfirmSheet
        open={confirmar === "borrador"}
        title="¿Volver a borrador?"
        description="Se pierde la aprobación: después de corregirlo, administración tiene que aprobarlo otra vez. El número se conserva."
        cancelLabel="Dejarlo aprobado"
        confirmLabel="Volver a borrador"
        onCancel={() => setConfirmar(null)}
        onConfirm={() => {
          setConfirmar(null);
          props.actuar(volverABorrador(c.id));
        }}
      />
      <ConfirmSheet
        open={confirmar === "eliminar"}
        title="¿Eliminar este borrador?"
        description="Se borran los datos y las fotos. No se puede deshacer."
        cancelLabel="Conservar"
        confirmLabel="Eliminar borrador"
        onCancel={() => setConfirmar(null)}
        onConfirm={eliminar}
      />
    </Marco>
  );
}
