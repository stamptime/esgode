import { cx } from "./cx";

export interface ToggleProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, onChange, label, disabled, className }: ToggleProps) {
  return (
    <label className={cx("es-toggle", checked && "es-toggle--on", disabled && "es-toggle--disabled", className)}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="es-toggle__track">
        <span className="es-toggle__knob" />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
