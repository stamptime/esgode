"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { ListaMovil, VolverALista, claseInspector } from "@/components/admin/movil";
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  Icon,
  SegmentedControl,
  StatCard,
  TextField,
  type DataColumn,
} from "@/components/ui";
import {
  COPIAS,
  ESTADOS,
  ETAPAS,
  MESES,
  PASOS,
  cobrosDe,
  copiaInfo,
  diaCorto,
  equipoCorto,
  estadoDe,
  faltantes,
  indiceEtapa,
  nombrePlantilla,
  numeroConSigla,
  pasoCompleto,
  tipoCorto,
  vencidas,
  type EstadoContrato,
} from "@/lib/contratos";
import { cop, decimalATexto, fechaHora, textoADecimal } from "@/lib/formato";
import { subirFoto } from "@/lib/fotos";
import { guardarAjustes, useStore } from "@/lib/store";
import { pedir } from "@/lib/useContrato";
import {
  anularContrato,
  eliminarBorrador,
  listarContratos,
  registrarPago,
  volverABorrador,
  type RespuestaContrato,
} from "@/server/contratos";
import type { Contrato } from "@/lib/types";

type Filtro = "todos" | "borradores" | "porfirmar" | "aldia" | "mora" | "cerrados";
type Fila = Contrato & { estado: EstadoContrato; numeroTxt: string };

const FILTROS: { value: Filtro; label: string; incluye: (e: EstadoContrato) => boolean }[] = [
  { value: "todos", label: "Todos", incluye: (e) => e !== "borrador" },
  { value: "borradores", label: "Borradores", incluye: (e) => e === "borrador" },
  { value: "porfirmar", label: "Por firmar", incluye: (e) => e === "porfirmar" },
  { value: "aldia", label: "Al día", incluye: (e) => e === "aldia" },
  { value: "mora", label: "En mora", incluye: (e) => e === "mora" },
  { value: "cerrados", label: "Cerrados", incluye: (e) => e === "pagado" || e === "cerrado" || e === "anulado" },
];

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const soportes = (c: Contrato) => COPIAS.filter((k) => k !== "original" && c.copias[k]).length;
const firmaCorta = (c: Contrato) => (c.firma === "digital" ? "Celular" : c.firma === "papel" ? "Papel" : null);

const COLUMNAS: DataColumn<Fila>[] = [
  { key: "numeroTxt", label: "No.", mono: true, width: 96 },
  {
    key: "cliente",
    label: "Cliente",
    render: (r) => (
      <div className="es-table__cell-person">
        <Avatar name={r.cliente.nombre} size="md" />
        <div>
          <div>{r.cliente.nombre}</div>
          <div className="es-table__secondary">{tipoCorto(r)}</div>
        </div>
      </div>
    ),
  },
  {
    key: "equipo",
    label: "Equipo",
    render: (r) => <span className="es-table__secondary">{equipoCorto(r.equipo)}</span>,
  },
  { key: "capital", label: "Valor", align: "right", mono: true, render: (r) => (r.capital ? cop(r.capital) : "—") },
  {
    key: "firma",
    label: "Firma",
    render: (r) => firmaCorta(r) ?? <span className="es-table__secondary">Pendiente</span>,
  },
  {
    key: "copias",
    label: "Soportes",
    mono: true,
    render: (r) =>
      r.estado === "borrador" ? (
        <span className="es-table__secondary">Paso {r.paso} de 4</span>
      ) : soportes(r) === 3 ? (
        "3/3"
      ) : (
        <Badge tone="warning">{soportes(r)}/3</Badge>
      ),
  },
  {
    key: "estado",
    label: "Estado",
    render: (r) => <Badge tone={ESTADOS[r.estado].tono}>{ESTADOS[r.estado].nombre}</Badge>,
  },
];

/** "AP-014" para la columna corta; "Borrador" sin número. */
const numeroTabla = (c: Contrato) =>
  c.numero == null ? "Borrador" : numeroConSigla(c).replace(/ No\. (\S+) del \d+$/, "-$1");

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[] | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [ajustes, setAjustes] = useState(false);

  useEffect(() => {
    pedir(listarContratos())
      .then((r) => setContratos(r.contratos))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!contratos) {
    return error ? (
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="title-3">No se pudieron cargar los contratos</div>
        <div className="callout text-ink-secondary">{error}</div>
      </main>
    ) : null;
  }

  const hoy = new Date();
  const filas: Fila[] = contratos.map((c) => ({ ...c, estado: estadoDe(c, hoy), numeroTxt: numeroTabla(c) }));
  const q = sinTildes(busqueda.trim());
  const qDig = busqueda.replace(/\D/g, "");
  const filtradas = filas.filter(
    (f) =>
      FILTROS.find((x) => x.value === filtro)!.incluye(f.estado) &&
      (!q ||
        sinTildes(f.cliente.nombre).includes(q) ||
        sinTildes(numeroConSigla(f)).includes(q) ||
        (qDig.length >= 3 && f.cliente.cc.replace(/\D/g, "").includes(qDig))),
  );
  const sel = filtradas.find((f) => f.id === selId) ?? filtradas[0] ?? null;

  // Indicadores
  const delMes = (d: Date) =>
    filas.filter(
      (f) =>
        !f.anulado &&
        f.etapa !== "borrador" &&
        new Date(f.creadoEn).getMonth() === d.getMonth() &&
        new Date(f.creadoEn).getFullYear() === d.getFullYear(),
    ).length;
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const enMes = delMes(hoy);
  const diferencia = enMes - delMes(mesAnterior);
  const activos = filas.filter((f) => f.estado === "aldia" || f.estado === "mora");
  const pendientes = activos.flatMap((f) => cobrosDe(f).slice(f.pagos.length));
  const cartera = pendientes.reduce((a, p) => a + p.valor, 0);
  const finSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 7);
  const semana = pendientes.filter(
    (p) => p.fecha >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) && p.fecha <= finSemana,
  );
  const enMora = filas.filter((f) => f.estado === "mora");
  const mora = enMora.flatMap((f) => vencidas(f, hoy)).reduce((a, p) => a + p.valor, 0);

  function reemplazar(c: Contrato) {
    setContratos((lista) => lista!.map((x) => (x.id === c.id ? c : x)));
  }
  function quitar(id: string) {
    setContratos((lista) => lista!.filter((x) => x.id !== id));
    setSelId(null);
  }

  return (
    <>
      <main className="flex min-w-0 flex-[999_1_600px] flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="title-1 m-0">Contratos</h1>
            <div className="callout text-ink-secondary">Acuerdos de pago y compraventas generados por el equipo.</div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <TextField
              className="w-full sm:w-65"
              placeholder="Buscar por número, cliente o cédula"
              leading="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Button variant="secondary" onClick={() => setAjustes(true)}>
              Ajustes
            </Button>
            <Link href="/contratos/nuevo" className="es-btn es-btn--primary es-btn--md">
              <Icon name="plus" />
              Nuevo contrato
            </Link>
          </div>
        </header>

        <div className="hidden grid-cols-4 gap-4 lg:grid">
          <StatCard
            label={`Contratos en ${MESES[hoy.getMonth()]}`}
            value={String(enMes)}
            delta={diferencia ? (diferencia > 0 ? `+${diferencia}` : `−${-diferencia}`) : undefined}
            hint={`vs. ${MESES[mesAnterior.getMonth()]}`}
          />
          <StatCard
            label="Cartera vigente"
            value={cop(cartera)}
            hint={`${activos.length} ${activos.length === 1 ? "acuerdo activo" : "acuerdos activos"}`}
          />
          <StatCard
            label="Vencen esta semana"
            value={cop(semana.reduce((a, p) => a + p.valor, 0))}
            hint={`${semana.length} ${semana.length === 1 ? "cuota" : "cuotas"}`}
          />
          <StatCard
            label="En mora"
            value={cop(mora)}
            delta={enMora.length ? String(enMora.length) : undefined}
            deltaTone="down"
            hint={enMora.length === 1 ? "contrato" : "contratos"}
          />
        </div>

        <SegmentedControl
          className="self-start overflow-x-auto max-lg:max-w-full"
          label="Filtrar contratos"
          options={FILTROS.map((f) => ({
            value: f.value,
            label: f.label,
            count: filas.filter((x) => f.incluye(x.estado)).length,
          }))}
          value={filtro}
          onChange={(v) => {
            setFiltro(v as Filtro);
            setSelId(null);
          }}
        />

        <div>
          <DataTable
            className="hidden overflow-x-auto lg:block"
            columns={COLUMNAS}
            rows={filtradas}
            rowKey="id"
            selectedKey={sel?.id}
            onRowClick={(r) => setSelId(r.id)}
            emptyText={
              contratos.length
                ? "No hay contratos con este filtro."
                : "Aún no hay contratos. Crea el primero con «Nuevo contrato»."
            }
          />
          <ListaMovil
            filas={filtradas}
            tarjeta={(f) => ({
              titulo: f.cliente.nombre,
              detalle: `${f.numeroTxt} · ${tipoCorto(f)}`,
              lado: (
                <>
                  <span className="data">{cop(f.capital)}</span>
                  <Badge tone={ESTADOS[f.estado].tono}>{ESTADOS[f.estado].nombre}</Badge>
                </>
              ),
            })}
            onElegir={(f) => setSelId(f.id)}
            vacio={
              contratos.length
                ? "No hay contratos con este filtro."
                : "Aún no hay contratos. Crea el primero con «Nuevo contrato»."
            }
          />
        </div>
      </main>

      {sel ? (
        <Detalle
          key={sel.id}
          contrato={sel}
          abierto={sel.id === selId}
          onCerrar={() => setSelId(null)}
          onCambio={reemplazar}
          onQuitar={quitar}
        />
      ) : null}

      <Ajustes abierto={ajustes} onCerrar={() => setAjustes(false)} />
    </>
  );
}

function Detalle(props: {
  contrato: Fila;
  abierto: boolean;
  onCerrar: () => void;
  onCambio: (c: Contrato) => void;
  onQuitar: (id: string) => void;
}) {
  const c = props.contrato;
  const { ajustes } = useStore();
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState("");
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [confirmar, setConfirmar] = useState<"borrador" | "eliminar" | null>(null);
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const cobros = cobrosDe(c);
  const ella = c.cliente.trato === "sra";

  async function enviar(accion: Promise<RespuestaContrato>) {
    setOcupado(true);
    setFallo("");
    try {
      props.onCambio((await pedir(accion)).contrato);
    } catch (e) {
      setFallo((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function agregarEvidencia(archivo: File) {
    setOcupado(true);
    setFallo("");
    try {
      props.onCambio(await subirFoto(c.id, "entrega", archivo));
    } catch (e) {
      setFallo((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function eliminar() {
    setConfirmar(null);
    setOcupado(true);
    try {
      await pedir<object>(eliminarBorrador(c.id));
      props.onQuitar(c.id);
    } catch (e) {
      setFallo((e as Error).message);
      setOcupado(false);
    }
  }

  if (c.estado === "borrador") {
    const falta = faltantes(c, ajustes.usura);
    return (
      <aside className={claseInspector(props.abierto)} aria-label="Borrador sin número">
        <VolverALista onClick={props.onCerrar} />
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="es-caption-label">Borrador · {nombrePlantilla(c).toLowerCase()}</div>
            <h2 className="title-2 m-0">{c.cliente.nombre || "Cliente sin nombre"}</h2>
            <div className="callout text-ink-secondary">{equipoCorto(c.equipo) || "Sin equipo aún"}</div>
          </div>
          <Badge tone="neutral">Borrador</Badge>
        </div>
        <section className="flex flex-col">
          <div className="es-caption-label mb-1">Progreso del formulario</div>
          {PASOS.map((p, i) => {
            const completo = i === 0 || pasoCompleto(c, i + 1);
            const aqui = i + 1 === c.paso;
            return (
              <div
                key={p}
                className="callout flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0"
              >
                <span>{p}</span>
                <Badge tone={completo ? "success" : aqui ? "accent" : "neutral"}>
                  {completo ? "Completo" : aqui ? "Aquí quedó" : "Pendiente"}
                </Badge>
              </div>
            );
          })}
        </section>
        <section className="flex flex-col gap-1">
          <div className="es-caption-label mb-1">{falta.length ? "Falta completar" : "Listo para aprobar"}</div>
          {falta.slice(0, 6).map((f) => (
            <div key={f} className="callout">
              · {f}
            </div>
          ))}
          <div className="footnote mt-1.5 text-ink-secondary">
            Guardado {fechaHora(c.editadoEn)} por {c.editadoPor || c.creadoPor}
          </div>
        </section>
        <div className="mt-auto flex flex-col gap-3 pt-4">
          {fallo ? (
            <div className="callout text-danger-text" role="alert">
              {fallo}
            </div>
          ) : null}
          <div className="flex gap-3">
            <Link href={`/contratos/nuevo?borrador=${c.id}`} className="es-btn es-btn--secondary es-btn--md flex-1">
              Continuar borrador
            </Link>
            <Link href={`/contratos/${c.id}`} className="es-btn es-btn--primary es-btn--md flex-1">
              Revisar y aprobar
            </Link>
          </div>
          {c.numero == null ? (
            <Button variant="danger" size="sm" disabled={ocupado} onClick={() => setConfirmar("eliminar")}>
              Eliminar borrador
            </Button>
          ) : null}
        </div>
        <ConfirmSheet
          open={confirmar === "eliminar"}
          title="¿Eliminar este borrador?"
          description="Se borran los datos y las fotos. No se puede deshacer."
          cancelLabel="Conservar"
          confirmLabel="Eliminar borrador"
          onCancel={() => setConfirmar(null)}
          onConfirm={eliminar}
        />
      </aside>
    );
  }

  const idx = indiceEtapa(c);
  const firmado = c.etapa === "firmado";
  const bloqueo = c.anulado
    ? `Anulado${c.motivoAnulacion ? ` · ${c.motivoAnulacion}` : ""}.`
    : firmado
      ? "Firmado · no se puede modificar. Puedes agregar evidencias, registrar pagos o anularlo con un motivo."
      : "Aprobado · contenido bloqueado. Para corregir, vuélvelo a borrador.";
  const entregas = (c.fotos.entregas ?? []).length;

  const plan = cobros.map((q, i) => {
    let est = "Pendiente";
    let tono: "neutral" | "success" | "danger" | "accent" = "neutral";
    if (c.estado !== "porfirmar" && c.estado !== "anulado") {
      if (i < c.pagos.length) [est, tono] = ["Pagada", "success"];
      else if (q.fecha < inicioHoy) [est, tono] = ["Vencida", "danger"];
      else if (i === c.pagos.length) [est, tono] = ["Próxima", "accent"];
    }
    return { ...q, ord: cobros.length === 1 ? "Pago único" : `Cuota ${i + 1}`, est, tono };
  });

  const firmaTxt =
    c.firma === "digital"
      ? `Firmado en el celular el ${fechaHora(c.firmadoEn!)} · ${c.firmaDispositivo} · verificación ${c.verificacion}.`
      : c.firma === "papel"
        ? `Firmado en papel con huella${c.firmadoEn ? `, marcado el ${fechaHora(c.firmadoEn)}` : ""}.`
        : "Aún sin firmar. Puede firmarse en el celular o imprimirse para firma en papel.";

  const pdf = (copias: string) => `/contratos/${c.id}/documento?copias=${copias}&archivo=uno`;

  return (
    <aside className={claseInspector(props.abierto)} aria-label={`Contrato ${numeroConSigla(c)}`}>
      <VolverALista onClick={props.onCerrar} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="es-caption-label">{nombrePlantilla(c)}</div>
          <h2 className="title-2 m-0">{numeroConSigla(c)}</h2>
          <div className="callout text-ink-secondary">
            {c.cliente.nombre} · {equipoCorto(c.equipo)}
          </div>
        </div>
        <Badge tone={ESTADOS[c.estado].tono}>{ESTADOS[c.estado].nombre}</Badge>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex gap-1.5">
          {ETAPAS.map((t, i) => (
            <Badge key={t} tone={i < idx ? "success" : i === idx ? "accent" : "neutral"}>
              {t}
            </Badge>
          ))}
        </div>
        <div className="callout text-ink-secondary">{bloqueo}</div>
      </section>

      {c.anulado ? null : (
        <section className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2.5">
          <span className="flex flex-col">
            <span className="callout font-semibold">
              {c.tipo === "compraventa" ? "Evidencia de recepción" : "Evidencia de entrega"}
            </span>
            <span className="footnote text-ink-secondary">
              {entregas} {entregas === 1 ? "foto" : "fotos"} · siempre se pueden agregar
            </span>
          </span>
          <label
            className={
              ocupado
                ? "es-btn es-btn--tinted es-btn--sm relative opacity-60"
                : "es-btn es-btn--tinted es-btn--sm relative cursor-pointer"
            }
          >
            <input
              className="absolute size-px opacity-0"
              type="file"
              accept="image/*"
              disabled={ocupado}
              aria-label="Agregar foto de la entrega"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) agregarEvidencia(f);
              }}
            />
            <Icon name="plus" />
            Agregar foto
          </label>
        </section>
      )}
      {c.etapa === "aprobado" && !c.anulado ? (
        <Button
          variant="plain"
          size="sm"
          className="self-start"
          disabled={ocupado}
          onClick={() => setConfirmar("borrador")}
        >
          Volver a borrador
        </Button>
      ) : null}

      {plan.length ? (
        <section className="flex flex-col">
          <div className="es-caption-label mb-1">Plan de pagos</div>
          {plan.map((p) => (
            <div
              key={p.ord}
              className="callout flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0"
            >
              <span>
                {p.ord} <span className="footnote text-ink-secondary">· {diaCorto(p.fecha)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="data whitespace-nowrap">{cop(p.valor)}</span>
                <Badge tone={p.tono}>{p.est}</Badge>
              </span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col">
        <div className="es-caption-label mb-1">Firma</div>
        <div className="callout text-ink-secondary">{firmaTxt}</div>
      </section>

      <section className="flex flex-col">
        <div className="mb-1 flex items-center justify-between">
          <div className="es-caption-label">Copias descargadas</div>
          <span className="data text-ink-secondary">{soportes(c)}/3 soportes</span>
        </div>
        {COPIAS.map((k) => {
          const reg = c.copias[k];
          return (
            <div
              key={k}
              className="callout flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">{copiaInfo(k, c.tipo).nombre}</span>
                <span className="footnote text-ink-secondary">
                  {reg
                    ? `Descargado ${fechaHora(reg.en)} · ${reg.por}`
                    : k === "original"
                      ? `Falta entregar ${ella ? "a la clienta" : "al cliente"}`
                      : "Falta descargar"}
                </span>
              </span>
              <Link
                href={pdf(k)}
                className={reg ? "es-btn es-btn--plain es-btn--sm" : "es-btn es-btn--tinted es-btn--sm"}
              >
                {reg ? "Descargar de nuevo" : "Descargar"}
              </Link>
            </div>
          );
        })}
      </section>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        {fallo ? (
          <div className="callout text-danger-text" role="alert">
            {fallo}
          </div>
        ) : null}
        <div className="flex gap-3">
          <Link href={`/contratos/${c.id}`} className="es-btn es-btn--secondary es-btn--md flex-1">
            Descargar PDF
          </Link>
          {c.estado === "porfirmar" ? (
            <Link href={`/contratos/${c.id}`} className="es-btn es-btn--primary es-btn--md flex-1">
              <Icon name="check" />
              Firmar
            </Link>
          ) : c.estado === "aldia" || c.estado === "mora" ? (
            <Button icon="check" className="flex-1" disabled={ocupado} onClick={() => enviar(registrarPago(c.id))}>
              Registrar pago
            </Button>
          ) : (
            <Link href={`/contratos/${c.id}/documento`} className="es-btn es-btn--primary es-btn--md flex-1">
              <Icon name="check" />
              Ver documento
            </Link>
          )}
        </div>
        {c.estado === "aldia" || c.estado === "mora" ? (
          <div className="footnote text-ink-secondary">
            Registrar pago marca como pagada la{" "}
            {cobros.length === 1 ? "obligación completa" : `cuota ${c.pagos.length + 1}`}.
          </div>
        ) : null}
        {c.anulado ? null : (
          <Button variant="danger" size="sm" disabled={ocupado} onClick={() => setAnulando(true)}>
            Anular contrato
          </Button>
        )}
      </div>

      <ConfirmSheet
        open={anulando}
        title={`¿Anular el ${numeroConSigla(c)}?`}
        description="Queda en el registro como anulado, con el motivo, y ya no se puede firmar ni registrar pagos. No se puede deshacer."
        cancelLabel="Conservar contrato"
        confirmLabel="Anular contrato"
        onCancel={() => setAnulando(false)}
        onConfirm={() => {
          if (motivo.trim().length < 5) return setFallo("Escribe el motivo de la anulación.");
          setAnulando(false);
          enviar(anularContrato(c.id, motivo));
        }}
      >
        <TextField
          className="mt-4 max-w-none"
          outlined
          label="Motivo"
          placeholder="Ej: el cliente desistió de la compra"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          error={anulando && fallo ? fallo : undefined}
        />
      </ConfirmSheet>
      <ConfirmSheet
        open={confirmar === "borrador"}
        title="¿Volver a borrador?"
        description="Se pierde la aprobación: después de corregirlo hay que aprobarlo otra vez. El número se conserva."
        cancelLabel="Dejarlo aprobado"
        confirmLabel="Volver a borrador"
        onCancel={() => setConfirmar(null)}
        onConfirm={() => {
          setConfirmar(null);
          enviar(volverABorrador(c.id));
        }}
      />
    </aside>
  );
}

/** Tasa propia de Esgode para los acuerdos con intereses, y la usura del mes para compararla. */
function Ajustes({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { ajustes } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const [tasaTxt, setTasaTxt] = useState("");
  const [usuraTxt, setUsuraTxt] = useState("");
  const [fallo, setFallo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) {
      setTasaTxt(decimalATexto(ajustes.tasa));
      setUsuraTxt(ajustes.usura == null ? "" : decimalATexto(ajustes.usura));
      setFallo("");
      d.showModal();
    }
    if (!abierto && d.open) d.close();
  }, [abierto, ajustes]);

  async function guardar() {
    const tasa = textoADecimal(tasaTxt);
    const usura = usuraTxt.trim() ? textoADecimal(usuraTxt) : null;
    if (!(tasa > 0 && tasa <= 10)) return setFallo("Escribe la tasa mensual, por ejemplo 1,9.");
    if (usura != null && !(usura > 0 && usura <= 10))
      return setFallo("Escribe la usura mensual, por ejemplo 2,1, o déjala vacía.");
    setOcupado(true);
    setFallo("");
    try {
      await guardarAjustes({ tasa, usura });
      onCerrar();
    } catch (e) {
      setFallo((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <dialog ref={ref} className="es-sheet" onCancel={onCerrar} onClose={onCerrar} aria-label="Ajustes de contratos">
      <div className="flex flex-col gap-2">
        <h2 className="title-3 m-0">Ajustes de contratos</h2>
        <p className="callout m-0 text-ink-secondary">
          La tasa calcula las cuotas de los acuerdos con intereses nuevos; los ya generados conservan la suya.
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-4">
        <TextField
          className="max-w-none"
          outlined
          label="Tasa mensual de los acuerdos (%)"
          inputMode="decimal"
          placeholder="1,9"
          value={tasaTxt}
          onChange={(e) => setTasaTxt(e.target.value.replace(/[^0-9.,]/g, ""))}
        />
        <TextField
          className="max-w-none"
          outlined
          label="Usura del mes, mensual (%)"
          inputMode="decimal"
          placeholder="Opcional"
          value={usuraTxt}
          onChange={(e) => setUsuraTxt(e.target.value.replace(/[^0-9.,]/g, ""))}
          hint="La que publica la Superfinanciera. El formulario avisa si la tasa queda por encima."
        />
        {fallo ? (
          <div className="callout text-danger-text" role="alert">
            {fallo}
          </div>
        ) : null}
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" className="flex-1" disabled={ocupado} onClick={onCerrar}>
          Cancelar
        </Button>
        <Button icon="check" className="flex-1" disabled={ocupado} onClick={guardar}>
          Guardar
        </Button>
      </div>
    </dialog>
  );
}
