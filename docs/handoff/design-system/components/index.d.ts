// Esgode CRM — component types (documentation). Global: window.Esgode
import type { ReactNode, ChangeEvent } from 'react';

export type IconName =
  | 'search' | 'person' | 'cart' | 'chat' | 'chart' | 'box' | 'plus' | 'check' | 'chevron' | 'home' | 'instagram' | 'whatsapp';

export interface IconProps {
  /** Glyph name. Placeholder set — see README › Iconography. */
  name: IconName;
  /** 16px (md, default) or 20px (lg). */
  size?: 'md' | 'lg';
  /** Accessible name; omit for decorative icons (hidden from AT). */
  label?: string;
  className?: string;
}

export interface ButtonProps {
  /** primary: the one `accent` action per view. secondary: `surface-sunken`. tinted: `surface-selected`. plain: text only. danger: destructive. */
  variant?: 'primary' | 'secondary' | 'tinted' | 'plain' | 'danger';
  /** sm 28px · md 36px (default) · lg 44px */
  size?: 'sm' | 'md' | 'lg';
  /** `radius-pill` instead of `radius-md` — the Apple call-to-action shape. */
  pill?: boolean;
  /** Leading glyph. With no children the button is icon-only and `label` is required. */
  icon?: IconName;
  label?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}

export interface TextFieldProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  /** Icon name or node shown before the input (`ink-secondary`). */
  leading?: IconName | ReactNode;
  /** Helper text in `ink-secondary`. Replaced by `error` when set. */
  hint?: string;
  /** Error text in `danger-text`; also paints the edge `danger`. */
  error?: string;
  /** `surface-raised` fill with a `border-control` edge, for forms on a sunken ground. Default is the filled style. */
  outlined?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export interface SegmentedOption { value: string; label: string; count?: number }
export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange?: (value: string) => void;
  /** Accessible group name, e.g. "Filtrar pedidos". */
  label?: string;
  className?: string;
}

export interface ToggleProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export interface BadgeProps {
  /** neutral (borrador) · accent (nuevo) · success (pagado) · warning (pendiente) · danger (cancelado). Always carries a word. */
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  /** Leading 6px status dot in the tone colour. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export interface StatCardProps {
  /** Uppercase `caption` label, e.g. "Ventas del mes". */
  label: string;
  /** Formatted value, e.g. "$ 4.280.000". */
  value: string;
  /** Formatted change, e.g. "+12 %" or "−3". A leading "-" or "−" reads as down unless `deltaTone` is set. */
  delta?: string;
  deltaTone?: 'up' | 'down' | 'flat';
  /** Comparison period, e.g. "vs. septiembre". */
  hint?: string;
  className?: string;
}

export interface AvatarProps {
  /** Full name; initials are derived from it when there is no image. */
  name: string;
  src?: string;
  /** sm 24 · md 32 (default) · lg 44 · xl 64 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export type SidebarItem = { id: string; label: string; icon?: IconName; count?: number } | { section: string };
export interface SidebarNavProps {
  /** Items in order; `{section}` entries render as uppercase headers. */
  items: SidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Wordmark text; "Esgode" by default (no logo asset yet). */
  brand?: string;
  /** URL of the Esgode mark (assets/Logos: the ink file in light, the white file in dark), shown at 24px before the wordmark. */
  logo?: string;
  /** Operator shown in the footer. */
  user?: { name: string; role?: string; src?: string };
  label?: string;
  className?: string;
}

export interface DataColumn<Row = any> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  /** Set `data` style (mono, tabular) — IDs, money, counts. */
  mono?: boolean;
  width?: string | number;
  render?: (row: Row) => ReactNode;
}
export interface DataTableProps<Row = any> {
  columns: DataColumn<Row>[];
  rows: Row[];
  /** Field used as the React key and for `selectedKey`. */
  rowKey?: string;
  selectedKey?: string | number;
  /** Makes rows hoverable and clickable; open the inspector from here. */
  onRowClick?: (row: Row) => void;
  /** Shown when `rows` is empty. Default "Sin resultados". */
  emptyText?: string;
  className?: string;
}

export declare const Button: (p: ButtonProps) => JSX.Element;
export declare const Icon: (p: IconProps) => JSX.Element;
export declare const TextField: (p: TextFieldProps) => JSX.Element;
export declare const SegmentedControl: (p: SegmentedControlProps) => JSX.Element;
export declare const Toggle: (p: ToggleProps) => JSX.Element;
export declare const Badge: (p: BadgeProps) => JSX.Element;
export declare const StatCard: (p: StatCardProps) => JSX.Element;
export declare const Avatar: (p: AvatarProps) => JSX.Element;
export declare const SidebarNav: (p: SidebarNavProps) => JSX.Element;
export declare const DataTable: <Row>(p: DataTableProps<Row>) => JSX.Element;
