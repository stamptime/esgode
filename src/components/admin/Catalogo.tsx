"use client";

import { useState } from "react";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { Button, DataTable, TextField, Toggle, type DataColumn } from "@/components/ui";
import { cop } from "@/lib/formato";
import { ListaMovil, VolverALista, claseInspector, type Tarjeta } from "./movil";

// Pantalla de lista + inspector para los catálogos del admin (categorías,
// marcas, financieras, productos). Misma estructura que Tasas.

export type Valores = Record<string, string | boolean>;

export interface Campo {
  clave: string;
  etiqueta: string;
  /** texto · dinero (pesos, guarda solo dígitos) · opcion (chips) · interruptor */
  tipo: "texto" | "dinero" | "opcion" | "interruptor";
  opciones?: { valor: string; etiqueta: string }[];
  /** Se elige al crear y luego queda fijo. */
  soloAlCrear?: boolean;
  placeholder?: string;
  ayuda?: string;
}

export interface CatalogoProps<Fila extends { id: string }> {
  titulo: string;
  subtitulo: string;
  textos: {
    nuevo: string; // "Nueva categoría"
    crear: string; // "Crear categoría"
    guardar: string; // "Guardar categoría"
    eliminar: string; // "Eliminar categoría"
    conservar: string; // "Conservar categoría"
    buscar: string; // placeholder de búsqueda
    vacio: string; // lista sin filas
  };
  columnas: DataColumn<Fila>[];
  /** Cómo se ve cada registro en la lista de celular. */
  tarjeta: (fila: Fila) => Tarjeta;
  filas: Fila[];
  /** Texto de la fila contra el que se busca. */
  textoDe: (fila: Fila) => string;
  nombreDe: (fila: Fila) => string;
  campos: Campo[];
  /** Valores del formulario; con `null`, los de un registro nuevo. */
  valoresDe: (fila: Fila | null) => Valores;
  /** Errores por clave de campo; cada uno dice cómo corregirlo. */
  validar: (valores: Valores, actual: Fila | null) => Partial<Record<string, string>>;
  /** Crea o actualiza; al crear devuelve el id nuevo. */
  guardar: (valores: Valores, actual: Fila | null) => Promise<string | undefined>;
  eliminar: (fila: Fila) => Promise<unknown>;
  /** Consecuencias de eliminar, para la confirmación. */
  avisoEliminar: (fila: Fila) => string;
  /** Si falta algo previo (p. ej. categorías para crear marcas), el motivo. */
  bloqueo?: string;
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Catalogo<Fila extends { id: string }>(props: CatalogoProps<Fila>) {
  const [busqueda, setBusqueda] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const q = sinTildes(busqueda.trim());
  const filas = q ? props.filas.filter((f) => sinTildes(props.textoDe(f)).includes(q)) : props.filas;
  const sel = creando ? null : (filas.find((f) => f.id === selId) ?? filas[0] ?? null);

  return (
    <>
      <main className="flex min-w-0 flex-[999_1_480px] flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="title-1 m-0">{props.titulo}</h1>
            <div className="callout text-ink-secondary">{props.subtitulo}</div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <TextField
              className="w-full sm:w-60"
              placeholder={props.textos.buscar}
              leading="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Button icon="plus" disabled={creando || !!props.bloqueo} onClick={() => setCreando(true)}>
              {props.textos.nuevo}
            </Button>
          </div>
        </header>

        {props.bloqueo ? <div className="callout text-ink-secondary">{props.bloqueo}</div> : null}

        <DataTable
          className="hidden overflow-x-auto lg:block"
          columns={props.columnas}
          rows={filas}
          rowKey="id"
          selectedKey={sel?.id}
          onRowClick={(f) => {
            setSelId(f.id);
            setCreando(false);
          }}
          emptyText={q ? "Nada coincide con la búsqueda. Prueba con otro nombre." : props.textos.vacio}
        />
        <ListaMovil
          filas={filas}
          tarjeta={props.tarjeta}
          onElegir={(f) => {
            setSelId(f.id);
            setCreando(false);
          }}
          vacio={q ? "Nada coincide con la búsqueda. Prueba con otro nombre." : props.textos.vacio}
        />
      </main>

      {creando || sel ? (
        <Formulario
          // Se reinicia al cambiar de registro y después de guardar.
          key={sel ? `${sel.id}:${JSON.stringify(props.valoresDe(sel))}` : "nuevo"}
          {...props}
          actual={sel}
          // En celular solo se abre al tocar un registro o crear uno.
          abierto={creando || sel?.id === selId}
          onCreado={(id) => {
            setCreando(false);
            setBusqueda("");
            setSelId(id);
          }}
          onCerrar={() => {
            setCreando(false);
            setSelId(null);
          }}
        />
      ) : null}
    </>
  );
}

function Formulario<Fila extends { id: string }>(
  props: CatalogoProps<Fila> & {
    actual: Fila | null;
    abierto: boolean;
    onCreado: (id: string) => void;
    onCerrar: () => void;
  },
) {
  const { actual, campos, textos } = props;
  const [original] = useState(() => props.valoresDe(actual));
  const [v, setV] = useState(original);
  const [intentado, setIntentado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState("");
  const cambiar = (clave: string, valor: string | boolean) => setV((previo) => ({ ...previo, [clave]: valor }));

  const errores = props.validar(v, actual);
  const valido = Object.values(errores).every((e) => !e);
  const sucio = JSON.stringify(v) !== JSON.stringify(original);

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

  function guardar() {
    setIntentado(true);
    if (!valido) return;
    enviar(async () => {
      const id = await props.guardar(v, actual);
      if (!actual && id) props.onCreado(id);
      // Al editar, el formulario se reinicia solo con los valores guardados; esto
      // cubre lo que no vuelve en ellos, como una contraseña recién asignada.
      else setV(original);
    });
  }

  return (
    <aside className={claseInspector(props.abierto)} aria-label={actual ? props.nombreDe(actual) : textos.nuevo}>
      <VolverALista onClick={props.onCerrar} />
      <div className="flex flex-col gap-1">
        <div className="es-caption-label">{props.titulo}</div>
        <h2 className="title-2 m-0">{actual ? props.nombreDe(actual) : textos.nuevo}</h2>
      </div>

      {campos.map((c) => {
        const error = intentado ? errores[c.clave] : undefined;
        const fijo = !!actual && !!c.soloAlCrear;
        if (c.tipo === "interruptor") {
          return (
            <div key={c.clave} className="flex flex-col gap-2">
              <Toggle label={c.etiqueta} checked={v[c.clave] === true} onChange={(on) => cambiar(c.clave, on)} />
              {error ? <div className="callout text-danger-text">{error}</div> : null}
            </div>
          );
        }
        if (c.tipo === "opcion") {
          return (
            <div key={c.clave} className="flex flex-col gap-2">
              <div className="callout text-ink-secondary">{c.etiqueta}</div>
              <div className="flex flex-wrap gap-2">
                {(c.opciones ?? []).map((o) => {
                  const on = v[c.clave] === o.valor;
                  return (
                    <button
                      key={o.valor}
                      type="button"
                      className={on ? "chip chip--on" : "chip"}
                      aria-pressed={on}
                      disabled={fijo && !on}
                      onClick={() => cambiar(c.clave, o.valor)}
                    >
                      {o.etiqueta}
                    </button>
                  );
                })}
              </div>
              {error ? (
                <div className="callout text-danger-text">{error}</div>
              ) : c.ayuda || fijo ? (
                <div className="callout text-ink-secondary">
                  {fijo ? "No se puede cambiar después de crear." : c.ayuda}
                </div>
              ) : null}
            </div>
          );
        }
        const texto = String(v[c.clave] ?? "");
        return (
          <TextField
            key={c.clave}
            className="max-w-none"
            outlined
            label={c.etiqueta}
            placeholder={c.placeholder}
            inputMode={c.tipo === "dinero" ? "numeric" : undefined}
            value={c.tipo === "dinero" ? (texto ? cop(Number(texto)) : "") : texto}
            onChange={(e) =>
              cambiar(
                c.clave,
                c.tipo === "dinero"
                  ? e.target.value
                      .replace(/[^0-9]/g, "")
                      .replace(/^0+/, "")
                      .slice(0, 10)
                  : e.target.value,
              )
            }
            hint={c.ayuda}
            error={error || undefined}
          />
        );
      })}

      <div className="mt-auto flex flex-col gap-3 pt-4">
        {fallo ? (
          <div className="callout text-danger-text" role="alert">
            {fallo}
          </div>
        ) : null}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={ocupado || (!!actual && !sucio)}
            onClick={() => {
              if (!actual) return props.onCerrar();
              setV(original);
              setIntentado(false);
            }}
          >
            {actual ? "Descartar" : "Cancelar"}
          </Button>
          <Button icon="check" className="flex-1" disabled={ocupado || (!!actual && !sucio)} onClick={guardar}>
            {actual ? textos.guardar : textos.crear}
          </Button>
        </div>
        {actual ? (
          <Button variant="danger" size="sm" disabled={ocupado} onClick={() => setConfirmando(true)}>
            {textos.eliminar}
          </Button>
        ) : null}
      </div>

      {actual ? (
        <ConfirmSheet
          open={confirmando}
          title={`¿Eliminar ${props.nombreDe(actual)}?`}
          description={props.avisoEliminar(actual)}
          cancelLabel={textos.conservar}
          confirmLabel={textos.eliminar}
          onCancel={() => setConfirmando(false)}
          onConfirm={() => {
            setConfirmando(false);
            enviar(async () => {
              await props.eliminar(actual);
              props.onCerrar();
            });
          }}
        />
      ) : null}
    </aside>
  );
}

/** "1 marca", "3 marcas" */
export const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Une consecuencias en una frase: "También se eliminarán 2 marcas y 5 tasas." */
export function arrastre(partes: string[], siNada: string): string {
  const con = partes.filter((p) => !p.startsWith("0 "));
  if (!con.length) return siNada;
  const lista = con.length > 1 ? `${con.slice(0, -1).join(", ")} y ${con[con.length - 1]}` : con[0];
  return `También se eliminarán ${lista}. No se puede deshacer.`;
}

export const igual = (a: string, b: string) => sinTildes(a.trim()) === sinTildes(b.trim());
