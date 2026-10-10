import type { ReactNode } from "react";
import { Button, Icon, cx } from "@/components/ui";

// Piezas del admin para pantallas angostas (menos de 1024px): la tabla pasa a
// lista y el inspector a pantalla completa que se abre al tocar un registro.

/** Clases del inspector: columna fija en escritorio; en celular, hoja a pantalla completa si está abierto. */
export function claseInspector(abierto: boolean): string {
  return cx(
    "min-w-0 flex-col gap-5 bg-surface-raised p-4 pb-8",
    abierto ? "fixed inset-0 z-20 flex overflow-y-auto" : "hidden",
    "lg:static lg:z-auto lg:flex lg:w-[360px] lg:flex-none lg:overflow-visible lg:rounded-l-xl lg:border-l lg:border-hairline lg:p-6",
  );
}

/** Regreso a la lista; solo en celular. */
export function VolverALista({ onClick }: { onClick: () => void }) {
  return (
    <div className="-ml-3 lg:hidden">
      <Button variant="plain" size="sm" onClick={onClick}>
        <Icon name="chevron" className="rotate-180" />
        Volver a la lista
      </Button>
    </div>
  );
}

export interface Tarjeta {
  titulo: ReactNode;
  detalle?: ReactNode;
  /** Dato o estado a la derecha. */
  lado?: ReactNode;
}

/** La tabla en celular: una fila por registro; tocarla abre el inspector. */
export function ListaMovil<Fila extends { id: string }>(props: {
  filas: Fila[];
  tarjeta: (fila: Fila) => Tarjeta;
  onElegir: (fila: Fila) => void;
  vacio: string;
}) {
  if (!props.filas.length) {
    return <div className="es-card callout py-8 text-center text-ink-secondary lg:hidden">{props.vacio}</div>;
  }
  return (
    <ul className="es-card m-0 list-none overflow-hidden p-0 lg:hidden">
      {props.filas.map((f) => {
        const t = props.tarjeta(f);
        return (
          <li key={f.id} className="border-b border-hairline last:border-b-0">
            <button
              type="button"
              className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left active:bg-surface-hover"
              onClick={() => props.onElegir(f)}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="headline truncate">{t.titulo}</span>
                {t.detalle ? <span className="callout truncate text-ink-secondary">{t.detalle}</span> : null}
              </span>
              {t.lado ? <span className="flex flex-none flex-col items-end gap-1">{t.lado}</span> : null}
              <Icon name="chevron" className="text-ink-tertiary" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
