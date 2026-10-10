"use client";

import { useState } from "react";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { Badge, Button, SegmentedControl, TextField, Toggle } from "@/components/ui";
import { cotizar, tasaEfectivaAnual, tasaMensual } from "@/lib/finanzas";
import { cop, decimalATexto, fecha, hora, pct, textoADecimal } from "@/lib/formato";
import { nombreDe } from "@/lib/formato";
import { actualizarTasa, crearTasa, eliminarTasa } from "@/lib/store";
import type { Categoria, Financiera, Marca, Tasa, TipoTasa } from "@/lib/types";

const PLAZOS = [3, 6, 9, 12, 18, 24, 36];
const PRECIO_EJEMPLO = 1899900;

interface Borrador {
  marcaId: string;
  financieraId: string;
  tipo: TipoTasa;
  tasaTxt: string;
  plazos: number[];
  inicialTxt: string;
  activa: boolean;
}

interface InspectorProps {
  categoria: Categoria;
  /** Marcas de la categoría. */
  marcas: Marca[];
  financieras: Financiera[];
  /** Tasas ya definidas en la categoría; una por marca y financiera. */
  existentes: Tasa[];
  /** Sin `tasa`, el inspector crea una nueva. */
  tasa?: Tasa;
  onCreada?: (id: string) => void;
  onCerrar: () => void;
}

export function Inspector({
  categoria,
  marcas,
  financieras,
  existentes,
  tasa,
  onCreada,
  onCerrar,
}: InspectorProps) {
  const ocupada = (marcaId: string, financieraId: string) =>
    existentes.some((t) => t.marcaId === marcaId && t.financieraId === financieraId);
  const libreDe = (marcaId: string) => financieras.find((f) => !ocupada(marcaId, f.id))?.id ?? "";

  const [original] = useState<Borrador>(() => {
    if (tasa) {
      return {
        marcaId: tasa.marcaId,
        financieraId: tasa.financieraId,
        tipo: tasa.tipo,
        tasaTxt: decimalATexto(tasa.tasa),
        plazos: tasa.plazos,
        inicialTxt: String(tasa.inicialMin),
        activa: tasa.activa,
      };
    }
    const marcaId = marcas.find((m) => libreDe(m.id))?.id ?? "";
    return {
      marcaId,
      financieraId: libreDe(marcaId),
      tipo: "mensual",
      tasaTxt: "",
      plazos: [6, 12],
      inicialTxt: "0",
      activa: true,
    };
  });
  const [b, setB] = useState(original);
  const [intentado, setIntentado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState("");
  const cambiar = (parche: Partial<Borrador>) => setB((previo) => ({ ...previo, ...parche }));

  const valor = textoADecimal(b.tasaTxt);
  const inicialMin = textoADecimal(b.inicialTxt);
  const errores = {
    tasa:
      b.tasaTxt.trim() && valor > 0 && valor <= 100 ? "" : "Escribe una tasa mayor que 0, por ejemplo 2,1.",
    plazos: b.plazos.length ? "" : "Elige al menos un plazo.",
    inicial:
      b.inicialTxt.trim() && Number.isInteger(inicialMin) && inicialMin >= 0 && inicialMin <= 90
        ? ""
        : "Escribe un porcentaje entero entre 0 y 90.",
  };
  const valido = !errores.tasa && !errores.plazos && !errores.inicial && !!b.marcaId && !!b.financieraId;
  const sucio = JSON.stringify(b) !== JSON.stringify(original);

  const tasaOk = !errores.tasa;
  const equivalencia = !tasaOk
    ? "Usa coma para los decimales."
    : b.tipo === "mensual"
      ? `Equivale a ${pct(tasaEfectivaAnual("mensual", valor) * 100)} efectiva anual.`
      : `Equivale a ${pct(tasaMensual("ea", valor) * 100)} mensual.`;

  const plazoVista = b.plazos.includes(12) ? 12 : (b.plazos[0] ?? 12);
  const vista =
    tasaOk && !errores.inicial
      ? cotizar({ precio: PRECIO_EJEMPLO, inicial: inicialMin, plazo: plazoVista, tipo: b.tipo, tasa: valor })
      : null;

  function guardar() {
    setIntentado(true);
    if (!valido) return;
    const datos = { tipo: b.tipo, tasa: valor, plazos: b.plazos, inicialMin, activa: b.activa };
    enviar(async () => {
      // Al editar, el inspector se reinicia solo con los valores guardados.
      if (tasa) return void (await actualizarTasa(tasa.id, datos));
      const id = await crearTasa({ marcaId: b.marcaId, financieraId: b.financieraId }, datos);
      if (id) onCreada?.(id);
    });
  }

  // Guarda o elimina en el servidor; si falla, el mensaje dice qué hacer.
  async function enviar(tarea: () => Promise<void>) {
    setOcupado(true);
    setFallo("");
    try {
      await tarea();
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo guardar. Vuelve a intentar.");
    } finally {
      setOcupado(false);
    }
  }

  const marca = nombreDe(marcas, b.marcaId);
  const financiera = nombreDe(financieras, b.financieraId);

  return (
    <aside
      className="flex w-full min-w-0 lg:w-[360px] lg:flex-none flex-col gap-5 rounded-l-xl border-l border-hairline bg-surface-raised p-6"
      aria-label={tasa ? `Tasa de ${marca} con ${financiera}` : "Nueva tasa"}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="es-caption-label">
            {categoria.nombre}
            {tasa ? ` · ${marca}` : ""}
          </div>
          <h2 className="title-2 m-0">{tasa ? financiera : "Nueva tasa"}</h2>
        </div>
        <Badge tone={b.activa ? "success" : "neutral"}>{b.activa ? "Activa" : "Inactiva"}</Badge>
      </div>

      {tasa ? null : (
        <>
          <div className="flex flex-col gap-2">
            <div className="callout text-ink-secondary">Marca</div>
            <div className="flex flex-wrap gap-2">
              {marcas.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={m.id === b.marcaId ? "chip chip--on" : "chip"}
                  aria-pressed={m.id === b.marcaId}
                  disabled={!libreDe(m.id)}
                  onClick={() =>
                    cambiar({
                      marcaId: m.id,
                      financieraId: ocupada(m.id, b.financieraId) ? libreDe(m.id) : b.financieraId,
                    })
                  }
                >
                  {m.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="callout text-ink-secondary">Financiera</div>
            <div className="flex flex-wrap gap-2">
              {financieras.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={f.id === b.financieraId ? "chip chip--on" : "chip"}
                  aria-pressed={f.id === b.financieraId}
                  disabled={ocupada(b.marcaId, f.id)}
                  onClick={() => cambiar({ financieraId: f.id })}
                >
                  {f.nombre}
                </button>
              ))}
            </div>
            <div className="callout text-ink-secondary">
              Solo puedes elegir combinaciones que aún no tienen tasa.
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <div className="callout text-ink-secondary">Tipo de tasa</div>
        <SegmentedControl
          className="flex [&>button]:flex-1"
          label="Tipo de tasa"
          options={[
            { value: "mensual", label: "Mensual" },
            { value: "ea", label: "Efectiva anual" },
          ]}
          value={b.tipo}
          onChange={(v) => cambiar({ tipo: v as TipoTasa })}
        />
      </div>

      <TextField
        className="max-w-none"
        outlined
        label={b.tipo === "mensual" ? "Tasa mensual (%)" : "Tasa efectiva anual (%)"}
        inputMode="decimal"
        placeholder="2,1"
        value={b.tasaTxt}
        onChange={(e) => cambiar({ tasaTxt: e.target.value.replace(/[^0-9.,]/g, "") })}
        hint={equivalencia}
        error={intentado ? errores.tasa : undefined}
      />

      <div className="flex flex-col gap-2">
        <div className="callout text-ink-secondary">Plazos permitidos (meses)</div>
        <div className="flex flex-wrap gap-2">
          {PLAZOS.map((p) => {
            const on = b.plazos.includes(p);
            return (
              <button
                key={p}
                type="button"
                className={on ? "chip chip--on" : "chip"}
                aria-pressed={on}
                onClick={() =>
                  cambiar({
                    plazos: on ? b.plazos.filter((x) => x !== p) : [...b.plazos, p].sort((x, y) => x - y),
                  })
                }
              >
                {p}
              </button>
            );
          })}
        </div>
        {intentado && errores.plazos ? (
          <div className="callout text-danger-text">{errores.plazos}</div>
        ) : null}
      </div>

      <TextField
        className="max-w-none"
        outlined
        label="Cuota inicial mínima (%)"
        inputMode="numeric"
        value={b.inicialTxt}
        onChange={(e) => cambiar({ inicialTxt: e.target.value.replace(/[^0-9]/g, "") })}
        hint="0 si la financiera no la exige."
        error={intentado ? errores.inicial : undefined}
      />

      <Toggle
        label="Tasa activa en la calculadora"
        checked={b.activa}
        onChange={(v) => cambiar({ activa: v })}
      />

      <div className="h-px bg-hairline" />

      <div className="callout flex flex-col gap-1 text-ink-secondary">
        <div className="es-caption-label">
          Vista previa · {marca} a {cop(PRECIO_EJEMPLO)}
        </div>
        <div className="flex justify-between text-ink">
          <span>Cuota mensual a {plazoVista} meses</span>
          <span className="font-mono tabular-nums">{vista ? cop(vista.cuota) : "—"}</span>
        </div>
        <div className="flex justify-between">
          <span>Intereses totales</span>
          <span className="font-mono tabular-nums">{vista ? cop(vista.intereses) : "—"}</span>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {tasa ? (
          <div className="footnote text-ink-secondary">
            Actualizada el {fecha(tasa.actualizadoEn)}, {hora(tasa.actualizadoEn)}
            {tasa.actualizadoPor ? ` por ${tasa.actualizadoPor}` : ""}
          </div>
        ) : null}
        {fallo ? (
          <div className="callout text-danger-text" role="alert">
            {fallo}
          </div>
        ) : null}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={ocupado || (!!tasa && !sucio)}
            onClick={() => {
              if (!tasa) return onCerrar();
              setB(original);
              setIntentado(false);
            }}
          >
            {tasa ? "Descartar" : "Cancelar"}
          </Button>
          <Button icon="check" className="flex-1" disabled={ocupado || (!!tasa && !sucio)} onClick={guardar}>
            {tasa ? "Guardar tasa" : "Crear tasa"}
          </Button>
        </div>
        {tasa ? (
          <Button variant="danger" size="sm" disabled={ocupado} onClick={() => setConfirmando(true)}>
            Eliminar tasa
          </Button>
        ) : null}
      </div>

      {tasa ? (
        <ConfirmSheet
          open={confirmando}
          title={`¿Eliminar la tasa de ${marca} con ${financiera}?`}
          description="Dejará de aparecer en la calculadora del staff. Si solo quieres pausarla, desactívala."
          cancelLabel="Conservar tasa"
          confirmLabel="Eliminar tasa"
          onCancel={() => setConfirmando(false)}
          onConfirm={() => {
            setConfirmando(false);
            enviar(async () => {
              await eliminarTasa(tasa.id);
              onCerrar();
            });
          }}
        />
      ) : null}
    </aside>
  );
}
