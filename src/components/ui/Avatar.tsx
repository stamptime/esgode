import { cx } from "./cx";

export interface AvatarProps {
  /** Nombre completo; de él salen las iniciales cuando no hay imagen. */
  name: string;
  src?: string;
  /** sm 24 · md 32 · lg 44 · xl 64 */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  return ((p[0] ?? "").charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : "")).toUpperCase();
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span className={cx("es-avatar", `es-avatar--${size}`, className)} title={name} aria-label={name} role="img">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" /> : iniciales(name)}
    </span>
  );
}
