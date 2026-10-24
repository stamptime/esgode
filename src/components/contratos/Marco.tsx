import type { ReactNode, RefObject } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui";

/** Pantalla de celular del módulo de contratos: encabezado, contenido con scroll y acciones fijas abajo. */
export function Marco({ mainRef, ...props }: {
  /** Destino de la flecha de regreso; sin él no hay flecha. */
  volver?: string;
  volverLabel?: string;
  titulo: string;
  subtitulo?: ReactNode;
  /** A la derecha del título, p. ej. el estado. */
  lado?: ReactNode;
  /** Debajo del título, p. ej. la barra de pasos. */
  extra?: ReactNode;
  /** Título grande (title-1) en vez de title-2. */
  grande?: boolean;
  pie?: ReactNode;
  mainRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col">
      <header className="flex flex-col gap-3 px-4 pt-13 pb-3">
        <div className="flex items-center gap-2">
          {props.volver ? (
            <Link
              href={props.volver}
              aria-label={props.volverLabel ?? "Volver"}
              className="inline-flex size-9 flex-none items-center justify-center rounded-md text-accent-text focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Icon name="chevron" size="lg" className="rotate-180" />
            </Link>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className={props.grande ? "title-1 m-0" : "title-2 m-0"}>{props.titulo}</h1>
            {props.subtitulo ? (
              <div className={props.grande ? "body text-ink-secondary" : "callout text-ink-secondary"}>
                {props.subtitulo}
              </div>
            ) : null}
          </div>
          {props.lado}
        </div>
        {props.extra}
      </header>
      <main ref={mainRef} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-2 pb-8">
        {props.children}
      </main>
      {props.pie ? (
        <footer className="flex flex-col gap-2 border-t border-hairline bg-surface px-4 pt-3 pb-8">{props.pie}</footer>
      ) : null}
    </div>
  );
}

/** Mensaje de carga o de error a pantalla completa. */
export function Aviso({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col items-center justify-center gap-2 px-8 text-center">
      <div className="title-3">{titulo}</div>
      {texto ? <div className="callout text-ink-secondary">{texto}</div> : null}
      {accion ? <div className="mt-4">{accion}</div> : null}
    </div>
  );
}

/** Opción de radio en tarjeta con título y descripción. */
export function Opcion(props: { on: boolean; titulo: string; texto: string; onClick: () => void }) {
  return (
    <button type="button" className={props.on ? "opt opt--on" : "opt"} role="radio" aria-checked={props.on} onClick={props.onClick}>
      <span className="radio" aria-hidden="true">
        <i />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="headline">{props.titulo}</span>
        <span className="callout text-ink-secondary">{props.texto}</span>
      </span>
    </button>
  );
}

/** Marca de verificación de las casillas. */
export function Visto() {
  return (
    <span className="caja" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l5 5L20 7" />
      </svg>
    </span>
  );
}
