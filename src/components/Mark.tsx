/* eslint-disable @next/next/no-img-element */

/** La marca de Esgode; cambia de archivo con el tema. No pasar de 64px (fuente de 114px). */
export function Mark({ size, className }: { size: number; className?: string }) {
  return (
    <span className={`es-mark ${className ?? ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <img className="es-mark__ink" src="/logos/esgode-mark-ink.png" alt="" />
      <img className="es-mark__white" src="/logos/esgode-mark-white.png" alt="" />
    </span>
  );
}

/** Lockup "es·de": la marca hace de g y de o. Debajo, "tech store". */
export function Lockup() {
  return (
    <div className="flex flex-col gap-0.5">
      <div
        className="flex items-baseline font-display text-[40px] leading-[44px] font-bold tracking-[-0.6px] text-ink"
        role="img"
        aria-label="esgode"
      >
        <span>es</span>
        <Mark size={54} className="mx-0.5 translate-y-3 self-center" />
        <span>de</span>
      </div>
      <div className="tagline text-ink-secondary">tech store</div>
    </div>
  );
}
