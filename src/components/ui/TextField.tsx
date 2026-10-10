"use client";

import { useId, type ChangeEvent, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export interface TextFieldProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  /** Nombre de icono o nodo antes del input. */
  leading?: IconName | ReactNode;
  hint?: string;
  /** Texto de error; reemplaza a `hint` y pinta el borde. */
  error?: string;
  /** Relleno `surface-raised` con borde, para formularios sobre fondo hundido o elevado. */
  outlined?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
}

export function TextField(props: TextFieldProps) {
  const auto = useId();
  const id = props.id ?? auto;
  const nota = props.error || props.hint;
  return (
    <div
      className={cx(
        "es-field",
        props.outlined && "es-field--outlined",
        props.error && "es-field--error",
        props.disabled && "es-field--disabled",
        props.className,
      )}
    >
      {props.label ? (
        <label className="es-field__label" htmlFor={id}>
          {props.label}
        </label>
      ) : null}
      <div className="es-field__control">
        {props.leading ? (
          <span className="es-field__leading">
            {typeof props.leading === "string" ? <Icon name={props.leading as IconName} /> : props.leading}
          </span>
        ) : null}
        <input
          id={id}
          className="es-field__input"
          type={props.type ?? "text"}
          name={props.name}
          placeholder={props.placeholder}
          value={props.value}
          defaultValue={props.defaultValue}
          onChange={props.onChange}
          disabled={props.disabled}
          autoComplete={props.autoComplete}
          inputMode={props.inputMode}
          aria-label={props.label ? undefined : props.placeholder}
          aria-invalid={props.error ? true : undefined}
          aria-describedby={nota ? `${id}-hint` : undefined}
        />
      </div>
      {nota ? (
        <div className="es-field__hint" id={`${id}-hint`}>
          {nota}
        </div>
      ) : null}
    </div>
  );
}
