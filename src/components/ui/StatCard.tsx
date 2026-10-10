import { cx } from "./cx";

export interface StatCardProps {
  label: string;
  value: string;
  /** Cambio ya formateado, p. ej. "+12 %". Un "-" o "−" inicial se lee como baja. */
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, delta, deltaTone, hint, className }: StatCardProps) {
  const tone = deltaTone ?? (delta ? (/^[-−]/.test(delta) ? "down" : "up") : "flat");
  return (
    <div className={cx("es-card", "es-stat", className)}>
      <div className="es-stat__label">{label}</div>
      <div className="es-stat__value">{value}</div>
      {delta || hint ? (
        <div className="es-stat__foot">
          {delta ? <span className={`es-stat__delta es-stat__delta--${tone}`}>{delta}</span> : null}
          {hint ? <span>{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
