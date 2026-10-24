/* eslint-disable @next/next/no-img-element */
"use client";

import { cx } from "@/components/ui";
import { urlFoto } from "@/lib/fotos";
import type { Foto } from "@/lib/types";

function Camara() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

/** Recuadro que abre la cámara trasera del celular; con foto, la muestra y permite quitarla. */
export function FotoHueco(props: {
  contratoId: string | null;
  titulo: string;
  ayuda?: string;
  foto?: Foto;
  /** "cedula" (proporción de la tarjeta), "cuadrada" (4:3) o "pequena" (1:1, en grilla de 3). */
  forma?: "cedula" | "cuadrada" | "pequena";
  ocupado?: boolean;
  /** Sin esta función la foto es de solo lectura. */
  onElegir?: (archivo: File) => void;
  onQuitar?: () => void;
  aceptaPdf?: boolean;
}) {
  const { foto, forma = "cedula" } = props;
  const clase = cx(
    "foto",
    forma === "cuadrada" && "foto--cuadrada",
    forma === "pequena" && "foto--1",
    foto && "foto--lista",
    props.ocupado && "foto--ocupada",
  );
  const contenido =
    foto && props.contratoId ? (
      <>
        <img src={urlFoto(props.contratoId, foto)} alt={props.titulo} />
        {forma === "pequena" ? null : <span className="foto__tag">{props.titulo}</span>}
      </>
    ) : (
      <>
        <Camara />
        <span>{props.ocupado ? "Subiendo…" : props.titulo}</span>
        {props.ayuda ? <span className="foto__ayuda">{props.ayuda}</span> : null}
      </>
    );
  if (!props.onElegir) return <div className={clase}>{contenido}</div>;
  return (
    <div className="relative">
      <label className={clase}>
        <input
          type="file"
          accept={props.aceptaPdf ? "image/*,application/pdf" : "image/*"}
          capture="environment"
          disabled={props.ocupado}
          aria-label={foto ? `Cambiar foto: ${props.titulo}` : `Tomar foto: ${props.titulo}`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) props.onElegir!(f);
          }}
        />
        {contenido}
      </label>
      {foto && props.onQuitar ? (
        <button
          type="button"
          className="foto__quitar"
          aria-label={`Quitar foto: ${props.titulo}`}
          onClick={props.onQuitar}
          disabled={props.ocupado}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
