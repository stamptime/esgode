import { cx } from "./cx";

// Glifos provisionales del sistema de diseño (README › Iconography).
const PATHS = {
  search:
    "M10.5 3a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Zm6.3 10.4 4.2 4.2-1.4 1.4-4.2-4.2 1.4-1.4Z",
  person:
    "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm-8 15c0-3.9 3.6-6 8-6s8 2.1 8 6v1H4v-1Zm2.1-1h11.8c-.5-1.9-2.8-3-5.9-3s-5.4 1.1-5.9 3Z",
  cart: "M3 4h2.4l1.2 2H21l-2.2 8H8.3l.5 2H19v2H7.2L4.2 6H3V4Zm4.8 4 1 4h8.5l1.1-4H7.8ZM9 19.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm8 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z",
  chat: "M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1Zm1 2v11l3-2.4V15h11V6H5Z",
  chart: "M4 20V10h3v10H4Zm6.5 0V4h3v16h-3ZM17 20v-7h3v7h-3Z",
  box: "M12 2.5 21 7v10l-9 4.5L3 17V7l9-4.5Zm0 2.2L5.9 7.8 12 10.9l6.1-3.1L12 4.7ZM5 9.3v6.5l6 3V12.3l-6-3Zm14 0-6 3v6.5l6-3V9.3Z",
  plus: "M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z",
  check: "M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4-10.6 10.6Z",
  chevron: "M9.3 5.3 16 12l-6.7 6.7-1.4-1.4L13.2 12 7.9 6.7l1.4-1.4Z",
  home: "M12 3l9 8h-2.5v9h-5v-6h-3v6h-5v-9H3l9-8Z",
  menu: "M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z",
  instagram:
    "M7.5 2.5h9A5 5 0 0 1 21.5 7.5v9a5 5 0 0 1-5 5h-9a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3h-9ZM12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm5-3.3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z",
  whatsapp:
    "M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 1 1-3.6 13l-.4-.2-2.6.7.7-2.5-.3-.4A7 7 0 0 1 12 5Zm-2.8 2.5c.2 0 .4.1.5.3l.9 2c.1.2 0 .4-.1.6l-.7.8c.6 1.2 1.6 2.2 2.8 2.8l.8-.7c.2-.1.4-.2.6-.1l2 .9c.2.1.3.3.3.5v1.4c0 .6-.5 1-1 1-4.5-.3-8-3.8-8.3-8.3 0-.6.4-1 1-1h1.2Z",
} as const;

export type IconName = keyof typeof PATHS;

export interface IconProps {
  name: IconName;
  /** 16px (md) o 20px (lg). */
  size?: "md" | "lg";
  /** Nombre accesible; sin él, el icono es decorativo. */
  label?: string;
  className?: string;
}

export function Icon({ name, size = "md", label, className }: IconProps) {
  return (
    <svg
      className={cx(
        "es-icon",
        size === "lg" && "es-icon--lg",
        (name === "instagram" || name === "whatsapp") && `es-icon--${name}`,
        className,
      )}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
    >
      {label ? <title>{label}</title> : null}
      <path d={PATHS[name] ?? PATHS.box} />
    </svg>
  );
}
