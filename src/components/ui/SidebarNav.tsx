import type { ReactNode } from "react";
import { cx } from "./cx";
import { Avatar } from "./Avatar";
import { Icon, type IconName } from "./Icon";

export type SidebarItem =
  | { id: string; label: string; icon?: IconName; count?: number; disabled?: boolean }
  | { section: string };

export interface SidebarNavProps {
  /** Ítems en orden; las entradas `{section}` son encabezados. */
  items: SidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  brand?: string;
  /** Marca de Esgode a 24px antes del wordmark: URL o nodo. */
  logo?: string | ReactNode;
  user?: { name: string; role?: string; src?: string };
  /** Acción junto al operador, p. ej. cerrar sesión. */
  userAction?: ReactNode;
  label?: string;
  className?: string;
}

export function SidebarNav(props: SidebarNavProps) {
  return (
    <nav className={cx("es-side", props.className)} aria-label={props.label ?? "Navegación"}>
      <div className="es-side__brand">
        {typeof props.logo === "string" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="es-side__logo" src={props.logo} alt="" />
        ) : (
          props.logo
        )}
        {props.brand ?? "Esgode"}
      </div>
      {props.items.map((it, i) => {
        if ("section" in it) {
          return (
            <div key={`s${i}`} className="es-side__section">
              {it.section}
            </div>
          );
        }
        const active = it.id === props.activeId;
        return (
          <button
            key={it.id}
            type="button"
            className={cx("es-side__item", active && "es-side__item--active")}
            aria-current={active ? "page" : undefined}
            disabled={it.disabled}
            title={it.disabled ? "Próximamente" : undefined}
            onClick={() => props.onSelect?.(it.id)}
          >
            {it.icon ? <Icon name={it.icon} /> : null}
            <span className="es-side__label">{it.label}</span>
            {it.count != null ? <span className="es-side__count">{it.count}</span> : null}
          </button>
        );
      })}
      {props.user ? (
        <div className="es-side__footer">
          <Avatar name={props.user.name} src={props.user.src} size="md" />
          <div className="es-side__footer-text">
            <div className="es-side__footer-name">{props.user.name}</div>
            {props.user.role ? <div className="es-side__footer-role">{props.user.role}</div> : null}
          </div>
          {props.userAction}
        </div>
      ) : null}
    </nav>
  );
}
