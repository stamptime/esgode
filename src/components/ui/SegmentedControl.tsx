import { cx } from "./cx";

export interface SegmentedOption {
  value: string;
  label: string;
  count?: number;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange?: (value: string) => void;
  /** Nombre accesible del grupo, p. ej. "Categoría". */
  label?: string;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, label, className }: SegmentedControlProps) {
  return (
    <div className={cx("es-seg", className)} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className="es-seg__opt"
          onClick={() => onChange?.(o.value)}
        >
          {o.label}
          {o.count != null ? <span className="es-seg__count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
