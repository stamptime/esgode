/* eslint-disable @next/next/no-img-element */

// El logo de Esgode es siempre una imagen oficial, nunca texto
// (docs/handoff/design-system/README.md › Logo). Cada archivo existe en tinta
// y en blanco; se cambia con el tema.

/** El anillo solo: para espacios cuadrados (icono de la app, estados vacíos). No pasar de 64px (fuente de 114px). */
export function Mark({ size, className }: { size: number; className?: string }) {
  return (
    <span className={`es-mark ${className ?? ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <img className="es-mark__ink" src="/logos/esgode-mark-ink.png" alt="" />
      <img className="es-mark__white" src="/logos/esgode-mark-white.png" alt="" />
    </span>
  );
}

/** "esgode" solo, para espacios estrechos: menú lateral (28px), cabeceras (20–24px). */
export function Wordmark({ height, className }: { height: number; className?: string }) {
  return (
    <span
      className={`es-mark ${className ?? ""}`}
      style={{ height, width: Math.round((height * 1200) / 504) }}
      role="img"
      aria-label="esgode"
    >
      <img className="es-mark__ink" src="/logos/esgode-wordmark-ink.png" alt="" />
      <img className="es-mark__white" src="/logos/esgode-wordmark-white.png" alt="" />
    </span>
  );
}

/** "esgode, tiendas de tecnología": donde la marca se presenta (ingreso). Mínimo 160px de ancho. */
export function Lockup({ width = 200 }: { width?: number }) {
  return (
    <span
      className="es-mark"
      style={{ width, height: Math.round((width * 512) / 1200) }}
      role="img"
      aria-label="esgode, tiendas de tecnología"
    >
      <img className="es-mark__ink" src="/logos/esgode-lockup-ink.png" alt="" />
      <img className="es-mark__white" src="/logos/esgode-lockup-white.png" alt="" />
    </span>
  );
}
