import type { ReactNode } from "react";
import { cx } from "./cx";

export interface BadgeProps {
  /** Siempre lleva una palabra: el color no carga el significado solo. */
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", dot, children, className }: BadgeProps) {
  return (
    <span className={cx("es-badge", `es-badge--${tone}`, className)}>
      {dot ? <span className="es-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
