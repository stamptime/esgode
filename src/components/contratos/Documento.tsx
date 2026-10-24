/* eslint-disable @next/next/no-img-element */
import { cx } from "@/components/ui";
import { ACREEDOR, codigoContrato, copiaInfo } from "@/lib/contratos";
import { bloquesDocumento, encabezado, paginar, type Bloque, type Segmento } from "@/lib/documento";
import type { Contrato, Copia } from "@/lib/types";

// El contrato tal como se imprime: hojas carta con encabezado, banda de la
// copia y pie con el código y la página. Las mismas hojas sirven para la
// vista en pantalla, la miniatura y el PDF.

function Texto({ segs }: { segs: Segmento[] }) {
  return segs.map((s, i) => (s.b ? <b key={i}>{s.t}</b> : <span key={i}>{s.t}</span>));
}

function Firmas({ b, contrato }: { b: Extract<Bloque, { tipo: "firmas" }>; contrato: Contrato }) {
  const digital = contrato.firma === "digital" && !!contrato.firmaTrazo;
  return (
    <div className="doc-firmas">
      <div>
        <div className="doc-firmas__lbl">{b.lblA}</div>
        <div className="doc-firmas__espacio" />
        <div className="doc-firmas__nombre">
          <b>{ACREEDOR.nombre}</b>
          <br />
          <b>C.C. </b>
          <span style={{ fontWeight: b.ccNegrita ? 700 : 400 }}>{ACREEDOR.cc}</span>
        </div>
      </div>
      <div>
        <div className="doc-firmas__lbl">{b.lblB}</div>
        <div className="doc-firmas__espacio">
          {digital ? (
            <svg width="150" height="70" viewBox="0 0 358 168" role="img" aria-label={`Firma de ${b.nombreB}`}>
              <path
                d={contrato.firmaTrazo!}
                fill="none"
                stroke="#1d1d1f"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </div>
        <div className="doc-firmas__nombre">
          <b>{b.nombreB}</b>
          <br />
          <b>C.C. </b>
          <span style={{ fontWeight: b.ccNegrita ? 700 : 400 }}>{b.ccB}</span>
        </div>
      </div>
      <div>
        {/* En la firma electrónica no se pide huella. */}
        <div className="doc-firmas__lbl">{b.huellaArriba && !digital ? "HUELLA" : "\u00a0"}</div>
        {digital ? null : <div className="doc-huella">{b.huellaLbl}</div>}
      </div>
    </div>
  );
}

export function hojasDe(contrato: Contrato): Bloque[][] {
  return paginar(bloquesDocumento(contrato), contrato.tipo === "compraventa");
}

export function Documento({
  contrato,
  copia,
  hojas = hojasDe(contrato),
  soloPrimera,
  oculta,
}: {
  contrato: Contrato;
  copia: Copia;
  hojas?: Bloque[][];
  /** Para la miniatura. */
  soloPrimera?: boolean;
  /** No sale al imprimir (sí en pantalla). */
  oculta?: boolean;
}) {
  const cv = contrato.tipo === "compraventa";
  const banda = copiaInfo(copia, contrato.tipo).doc;
  const { lineas, version } = encabezado(contrato);
  const pie =
    `${codigoContrato(contrato)} · ${banda}` +
    (contrato.firma === "digital" && contrato.verificacion
      ? ` · Firmado electrónicamente · verificación ${contrato.verificacion}`
      : "");
  return (soloPrimera ? hojas.slice(0, 1) : hojas).map((bloques, i) => (
    <section key={i} className={cx("doc-hoja", cv && "doc-hoja--cv", oculta && "doc-oculta")} aria-label={`Página ${i + 1}`}>
      {cv ? (
        <div className="doc-copia doc-copia--cv">{banda}</div>
      ) : (
        <div className="doc-cabecera">
          <img src="/logos/esgode-wordmark-ink.png" alt="esgode" />
          <div className="flex flex-col items-end">
            <div className="doc-tipo">
              {lineas.map((l) => (
                <div key={l}>{l}</div>
              ))}
            </div>
            {version ? <div className="doc-tipo mt-0.5 font-normal">{version}</div> : null}
            <div className="doc-copia">{banda}</div>
          </div>
        </div>
      )}

      {bloques.map((b, j) => {
        if (b.tipo === "titulo")
          return (
            <h1 key={j} className={b.cv ? "doc-titulo doc-titulo--cv" : "doc-titulo"}>
              {b.lineas.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </h1>
          );
        if (b.tipo === "h")
          return (
            <h2 key={j} className="doc-h">
              {b.texto}
            </h2>
          );
        if (b.tipo === "li")
          return (
            <div key={j} className="doc-li">
              <span>{b.num}</span>
              <span>
                <Texto segs={b.segs} />
              </span>
            </div>
          );
        if (b.tipo === "firmas") return <Firmas key={j} b={b} contrato={contrato} />;
        return (
          <p key={j} className="doc-p">
            <Texto segs={b.segs} />
          </p>
        );
      })}

      <div className="doc-pie">
        <span>{pie}</span>
        <span className="whitespace-nowrap">
          Página {i + 1} de {hojas.length}
        </span>
      </div>
    </section>
  ));
}
