/* eslint-disable @next/next/no-img-element */
import { cx } from "@/components/ui";
import { ACREEDOR, ELEX, codigoContrato, copiaInfo, numeroCorto } from "@/lib/contratos";
import {
  bloquesDocumento,
  encabezado,
  paginar,
  paginasAnexo,
  type Bloque,
  type FotoAnexo,
  type PaginaAnexo,
  type Segmento,
} from "@/lib/documento";
import { fechaHora } from "@/lib/formato";
import { urlFoto } from "@/lib/fotos";
import type { Contrato, Copia } from "@/lib/types";

// El contrato tal como se imprime: hojas carta con encabezado, banda de la
// copia y pie con el código y la página. Las mismas hojas sirven para la
// vista en pantalla, la miniatura y el PDF. El borrador lleva marca de agua y
// no tiene número; al final va el anexo de evidencias fotográficas.

function Texto({ segs }: { segs: Segmento[] }) {
  return segs.map((s, i) => (s.b ? <b key={i}>{s.t}</b> : <span key={i}>{s.t}</span>));
}

function Firmas({ b, contrato }: { b: Extract<Bloque, { tipo: "firmas" }>; contrato: Contrato }) {
  const digital = contrato.firma === "digital" && !!contrato.firmaTrazo;
  const cc = (v: string) => <span style={{ fontWeight: b.ccNegrita ? 700 : 400 }}>{v}</span>;
  return (
    <div className="doc-firmas">
      <div>
        <div className="doc-firmas__lbl">{b.lblA}</div>
        <div className="doc-firmas__espacio" />
        {contrato.acreedor === "elex" ? (
          <div className="doc-firmas__nombre">
            <b>{ELEX.nombre}</b>
            <br />
            <b>NIT </b>
            {cc(ELEX.nit)}
            <br />
            Rep. legal: {ACREEDOR.nombre}
            <br />
            <b>C.C. </b>
            {cc(ACREEDOR.cc)}
          </div>
        ) : (
          <div className="doc-firmas__nombre">
            <b>{ACREEDOR.nombre}</b>
            <br />
            <b>C.C. </b>
            {cc(ACREEDOR.cc)}
          </div>
        )}
      </div>
      <div>
        <div className="doc-firmas__lbl">{b.lblB}</div>
        <div className="doc-firmas__espacio">
          {digital ? (
            <svg
              width="150"
              height="70"
              viewBox={`0 0 ${contrato.firmaLienzo || "358 168"}`}
              role="img"
              aria-label={`Firma de ${b.nombreB}`}
            >
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
          {cc(b.ccB)}
        </div>
      </div>
      <div>
        {/* En la firma electrónica no se pide huella. */}
        <div className="doc-firmas__lbl">{b.huellaArriba && !digital ? "HUELLA" : " "}</div>
        {digital ? null : <div className="doc-huella">{b.huellaLbl}</div>}
      </div>
    </div>
  );
}

function Figuras({ contrato, fotos, columnas }: { contrato: Contrato; fotos: FotoAnexo[]; columnas: 2 | 4 }) {
  return (
    <div className={columnas === 2 ? "doc-ev doc-ev--2" : "doc-ev doc-ev--4"}>
      {fotos.map((f) => (
        <figure key={f.foto.archivo}>
          <div className="doc-ev__img">
            <img src={urlFoto(contrato.id, f.foto)} alt={f.titulo} />
          </div>
          <figcaption>
            <b>{f.titulo}</b>
            <br />
            Tomada el {fechaHora(f.foto.en)} · {f.foto.por}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function Anexo({ contrato: c, pagina }: { contrato: Contrato; pagina: PaginaAnexo }) {
  const compra = c.tipo === "compraventa";
  const pares: [string, string, boolean][][] = [];
  for (let i = 0; i < pagina.liquidacion.length; i += 2) pares.push(pagina.liquidacion.slice(i, i + 2));
  const imeis = c.equipo.imeis.filter(Boolean);
  return (
    <div className="doc-anexo">
      {pagina.primera ? (
        <>
          <h1 className="doc-titulo mb-2">EVIDENCIAS FOTOGRÁFICAS</h1>
          <p className="doc-p mb-[18px] text-center">
            Anexo del {compra ? "CONTRATO DE COMPRAVENTA" : "ACUERDO DE PAGO"} No.{" "}
            {numeroCorto(c.tipo, c.anio, c.numero)} DEL {c.anio ?? new Date().getFullYear()} ·{" "}
            {c.cliente.nombre.trim().toUpperCase()} · C.C. {c.cliente.cc}
          </p>
        </>
      ) : (
        <h1 className="doc-titulo mb-4">EVIDENCIAS FOTOGRÁFICAS (CONTINUACIÓN)</h1>
      )}
      {pares.length ? (
        <>
          <h3 className="mt-0">Liquidación de la negociación</h3>
          <div className="doc-liq" role="table" aria-label="Liquidación de la negociación">
            {pares.map((par) => (
              <div key={par[0][0]} role="row">
                {par.flatMap(([k, v, tot]) => [
                  <span key={k} role="cell" className={tot ? "tot" : undefined}>
                    {k}
                  </span>,
                  <span key={k + "v"} role="cell" className={cx("num", tot && "tot")}>
                    {v}
                  </span>,
                ])}
              </div>
            ))}
          </div>
        </>
      ) : null}
      {pagina.cedula.length ? (
        <>
          <h3>Documento de identidad</h3>
          <Figuras contrato={c} fotos={pagina.cedula} columnas={2} />
        </>
      ) : null}
      {pagina.equipo.length ? (
        <>
          <h3>
            Fotos del equipo · {[c.equipo.marca, c.equipo.modelo].filter(Boolean).join(" ")}
            {imeis.length ? ` · IMEI ${imeis.join(" / ")}` : ""}
          </h3>
          <Figuras contrato={c} fotos={pagina.equipo} columnas={4} />
        </>
      ) : null}
      {pagina.entregas.length ? (
        <>
          <h3>{compra ? "Recepción del equipo" : "Entrega del equipo"}</h3>
          <Figuras contrato={c} fotos={pagina.entregas} columnas={4} />
        </>
      ) : null}
    </div>
  );
}

type Hoja = { tipo: "texto"; bloques: Bloque[] } | { tipo: "anexo"; pagina: PaginaAnexo };

export function hojasDe(contrato: Contrato): Hoja[] {
  return [
    ...paginar(bloquesDocumento(contrato), contrato.tipo === "compraventa").map((bloques): Hoja => ({
      tipo: "texto",
      bloques,
    })),
    ...paginasAnexo(contrato).map((pagina): Hoja => ({ tipo: "anexo", pagina })),
  ];
}

export function Documento({
  contrato,
  copia,
  hojas = hojasDe(contrato),
  solo,
  oculta,
}: {
  contrato: Contrato;
  copia: Copia;
  hojas?: Hoja[];
  /** Índice de la única hoja que se muestra (visor de la revisión). */
  solo?: number;
  /** No sale al imprimir (sí en pantalla). */
  oculta?: boolean;
}) {
  const cv = contrato.tipo === "compraventa";
  const borrador = contrato.etapa === "borrador";
  const banda = copiaInfo(copia, contrato.tipo).doc;
  const { lineas, version } = encabezado(contrato);
  const pie =
    (borrador ? `BORRADOR · ${banda}` : `${codigoContrato(contrato)} · ${banda}`) +
    (contrato.firma === "digital" && contrato.verificacion
      ? ` · Firmado electrónicamente · verificación ${contrato.verificacion}`
      : "");
  return hojas.map((hoja, i) =>
    solo != null && solo !== i ? null : (
      <section
        key={i}
        className={cx("doc-hoja", cv && "doc-hoja--cv", oculta && "doc-oculta")}
        aria-label={`Página ${i + 1}`}
      >
        {borrador ? (
          <div className="doc-marca" aria-hidden="true">
            BORRADOR · NO VÁLIDO
          </div>
        ) : null}
        {cv ? (
          <div className="doc-copia doc-copia--cv">{banda}</div>
        ) : (
          <div className="doc-cabecera">
            <div className="flex flex-col">
              <img src="/logos/esgode-wordmark-ink.png" alt="esgode" className="self-start" />
              {contrato.acreedor === "elex" ? (
                <div className="doc-elex">
                  Esgode, tiendas de tecnología · Marca operada por {ELEX.nombre} (NIT {ELEX.nit}), responsable
                  legalmente
                  <br />
                  Más información: {ELEX.tel} · {ELEX.correo}
                </div>
              ) : null}
            </div>
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

        {hoja.tipo === "anexo" ? (
          <Anexo contrato={contrato} pagina={hoja.pagina} />
        ) : (
          hoja.bloques.map((b, j) => {
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
          })
        )}

        <div className="doc-pie">
          <span>{pie}</span>
          <span className="whitespace-nowrap">
            Página {i + 1} de {hojas.length}
          </span>
        </div>
      </section>
    ),
  );
}
