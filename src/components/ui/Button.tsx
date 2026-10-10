import type { CSSProperties, ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "tinted" | "plain" | "danger";
  /** sm 28px · md 36px · lg 44px */
  size?: "sm" | "md" | "lg";
  pill?: boolean;
  /** Glifo inicial. Sin children el botón es solo icono y `label` es obligatorio. */
  icon?: IconName;
  label?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Button({
  variant = "primary",
  size = "md",
  pill,
  icon,
  label,
  disabled,
  type = "button",
  onClick,
  children,
  className,
  style,
}: ButtonProps) {
  const iconOnly = !!icon && !children;
  return (
    <button
      type={type}
      className={cx(
        "es-btn",
        `es-btn--${variant}`,
        `es-btn--${size}`,
        pill && "es-btn--pill",
        iconOnly && "es-btn--icon-only",
        className,
      )}
      style={style}
      disabled={disabled}
      onClick={onClick}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}
