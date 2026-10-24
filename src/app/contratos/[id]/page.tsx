"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Documento, hojasDe } from "@/components/contratos/Documento";
import { Aviso, Marco, Opcion, Visto } from "@/components/contratos/Marco";
import { Badge, Button, Toggle } from "@/components/ui";
import { COPIAS, ESTADOS, copiaInfo, diaCorto, estadoDe, equipoCorto, nombrePlantilla, numeroContrato, planDe } from "@/lib/contratos";
import { cop } from "@/lib/formato";
import { useRequerirRol } from "@/lib/store";
import { useContrato } from "@/lib/useContrato";
import { marcarFirmadoEnPapel } from "@/server/contratos";
import type { Contrato, Copia } from "@/lib/types";

export default function ContratoListoPage() {
  const usuario = useRequerirRol(["staff", "admin"]);
  const { id } = useParams<{ id: string }>();
  const { contrato, error, ocupado, actuar } = useContrato(id);
  if (!usuario) return null;
  const volver = usuario.rol === "admin" ? "/admin/contratos" : "/contratos/nuevo";
  if (!contrato) {
    return error ? (
      <Aviso titulo="No se pudo abrir el contrato" texto={error} accion={<Link className="es-btn es-btn--secondary es-btn--md" href={volver}>Volver</Link>} />
    ) : null;
  }
  return <Salida contrato={contrato} volver={volver} error={error} ocupado={ocupado} papel={() => actuar(marcarFirmadoEnPapel(contrato.id))} />;
}

function Salida(props: { contrato: Contrato; volver: string; error: string; ocupado: boolean; papel: () => void }) {
  const { contrato: c } = props;
  const router = useRouter();
  const pendiente = c.firma === "pendiente" && !c.anulado;
  const [modo, setModo] = useState<"digital" | "papel">("papel");
  const [sel, setSel] = useState<Record<Copia, boolean>>({ original: true, cartera: true, contabilidad: true, archivo: true });
  const [porArchivo, setPorArchivo] = useState(false);

  const estado = ESTADOS[estadoDe(c)];
  const ella = c.cliente.trato === "sra";
  const clienta = ella ? "la clienta" : "el cliente";
  const rol = c.tipo === "compraventa" ? (ella ? "Vendedora" : "Vendedor") : ella ? "Deudora" : "Deudor";
  const plan = planDe(c, c.tasa, new Date(c.creadoEn));
  const elegidas = COPIAS.filter((k) => sel[k]);
  const n = elegidas.length;
  // Se descarga cuando ya está firmado o si se eligió la firma en papel.
  const descargar = !c.anulado && (!pendiente || modo === "papel");
  const hojas = hojasDe(c);
  const paginas = n * hojas.length;

  const resumenPlan =
    c.tipo === "compraventa"
      ? "Pago a la firma"
      : c.forma === "cuotas"
        ? `${c.nCuotas} × ${cop(plan[0]?.valor ?? 0)}`
        : `Pago único · ${diaCorto(plan[0].fecha)}`;

  function irADocumento() {
    const q = new URLSearchParams({ copias: elegidas.join(","), archivo: porArchivo && n > 1 ? "cada" : "uno" });
    router.push(`/contratos/${c.id}/documento?${q}`);
  }

  const mensaje = encodeURIComponent(
    `Hola ${c.cliente.nombre.split(" ")[0]}, te escribimos de Esgode Tech Store. Te comparto tu ${nombrePlantilla(c).toLowerCase()} ${numeroContrato(c)}.`,
  );

  return (
    <Marco
      volver={props.volver}
      volverLabel="Volver"
      titulo="Contrato listo"
      subtitulo={`${c.tipo === "compraventa" ? "Compraventa" : "Acuerdo de pago"} ${numeroContrato(c)}`}
      lado={<Badge tone={estado.tono}>{estado.nombre}</Badge>}
      pie={
        <>
          {props.error ? (
            <div className="callout text-danger-text" role="alert">
              {props.error}
            </div>
          ) : null}
          {descargar ? (
            <Button size="lg" pill className="flex-1" disabled={n === 0} onClick={irADocumento}>
              {n === 0 ? "Elige al menos una copia" : porArchivo && n > 1 ? `Descargar ${n} PDF` : "Descargar PDF"}
            </Button>
          ) : (
            <Link href={`/contratos/${c.id}/firma`} className="es-btn es-btn--primary es-btn--lg es-btn--pill">
              Pasar el celular a {clienta}
            </Link>
          )}
        </>
      }
    >
      <section className="flex items-start gap-3.5">
        <Link
          href={`/contratos/${c.id}/documento`}
          aria-label="Ver el documento completo"
          className="block h-[158px] w-[122px] flex-none overflow-hidden rounded-lg border border-hairline bg-white shadow-(--shadow-card)"
        >
          <div className="doc pointer-events-none origin-top-left scale-[0.1495]">
            <Documento contrato={c} copia="original" hojas={hojas} soloPrimera />
          </div>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          {[
            [rol, c.cliente.nombre],
            ["Equipo", equipoCorto(c.equipo)],
            [c.tipo === "compraventa" ? "Valor" : "Capital", cop(c.capital)],
            ["Plan", resumenPlan],
          ].map(([k, v], i) => (
            <div key={k} className={i ? "flex justify-between gap-3 py-2" : "flex justify-between gap-3 pb-2"}>
              <span className="body text-ink-secondary">{k}</span>
              <span className="body text-right">{v}</span>
            </div>
          ))}
          <Link href={`/contratos/${c.id}/documento`} className="callout mt-1 font-semibold text-accent-text no-underline">
            Ver documento completo
          </Link>
        </div>
      </section>

      {c.anulado ? (
        <div className="es-card callout text-ink-secondary">Este contrato fue anulado. Ya no se puede firmar.</div>
      ) : pendiente ? (
        <section className="flex flex-col gap-2">
          <div className="es-caption-label">¿Cómo se firma?</div>
          <div role="radiogroup" aria-label="Forma de firma" className="flex flex-col gap-2">
            <Opcion
              on={modo === "digital"}
              titulo="Firmar en el celular"
              texto={`${ella ? "La clienta" : "El cliente"} revisa las condiciones y firma en la pantalla de este celular. Después descargas el PDF firmado.`}
              onClick={() => setModo("digital")}
            />
            <Opcion
              on={modo === "papel"}
              titulo="Descargar PDF"
              texto="Para enviarlo por WhatsApp, guardarlo o imprimirlo. Si se firma en papel, lleva recuadro para la huella."
              onClick={() => setModo("papel")}
            />
          </div>
        </section>
      ) : (
        <div className="es-card callout text-ink-secondary">
          {c.firma === "digital"
            ? `Firmado en el celular el ${diaCorto(new Date(c.firmadoEn!))}. El PDF lleva la firma y el código de verificación.`
            : "Firmado en papel con huella."}
        </div>
      )}

      {descargar ? (
        <>
          <section className="es-card flex flex-col px-4 pt-1 pb-3">
            <div className="flex items-center justify-between pt-3 pb-1">
              <div className="es-caption-label">Incluir en el PDF</div>
              <span className="callout text-ink-secondary">
                {n} {n === 1 ? "copia" : "copias"} · {paginas} páginas
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
                      <span className="callout text-ink-secondary">{k === "original" ? `El que recibe ${clienta}.` : info.para}</span>
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
          <div className="callout text-ink-secondary">
            {porArchivo
              ? `Se guarda un PDF por copia (${n}), uno tras otro, nombrados con el número del contrato y el área.`
              : "Se guarda un solo archivo con todas las copias, una tras otra."}{" "}
            Cada copia lleva su área en el encabezado y en el pie de página, y cada descarga queda en el historial del contrato.
          </div>
          <a
            className="es-btn es-btn--secondary es-btn--lg"
            href={`https://wa.me/57${c.cliente.cel.replace(/\D/g, "")}?text=${mensaje}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="es-icon es-icon--whatsapp" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 1 1-3.6 13l-.4-.2-2.6.7.7-2.5-.3-.4A7 7 0 0 1 12 5Zm-2.8 2.5c.2 0 .4.1.5.3l.9 2c.1.2 0 .4-.1.6l-.7.8c.6 1.2 1.6 2.2 2.8 2.8l.8-.7c.2-.1.4-.2.6-.1l2 .9c.2.1.3.3.3.5v1.4c0 .6-.5 1-1 1-4.5-.3-8-3.8-8.3-8.3 0-.6.4-1 1-1h1.2Z" />
            </svg>
            Escribir a {clienta} por WhatsApp
          </a>
          {pendiente ? (
            <Button variant="plain" size="sm" className="self-center" disabled={props.ocupado} onClick={props.papel}>
              Ya se firmó en papel
            </Button>
          ) : null}
        </>
      ) : null}
    </Marco>
  );
}

