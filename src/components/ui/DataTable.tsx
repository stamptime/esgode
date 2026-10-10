import type { ReactNode } from "react";
import { cx } from "./cx";

export interface DataColumn<Row> {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Estilo `data` (mono, tabular): IDs, dinero, cantidades. */
  mono?: boolean;
  width?: string | number;
  render?: (row: Row) => ReactNode;
}

export interface DataTableProps<Row> {
  columns: DataColumn<Row>[];
  rows: Row[];
  /** Campo usado como key de React y para `selectedKey`. */
  rowKey?: keyof Row & string;
  selectedKey?: string | number;
  /** Hace las filas clicables; desde aquí se abre el inspector. */
  onRowClick?: (row: Row) => void;
  emptyText?: string;
  className?: string;
}

export function DataTable<Row>(props: DataTableProps<Row>) {
  const { columns, rows, rowKey, onRowClick } = props;
  return (
    <div className={cx("es-table-wrap", props.className)}>
      <table className={cx("es-table", onRowClick && "es-table--clickable")}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={c.align === "right" ? "es-align-right" : undefined}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="es-table__empty">{props.emptyText ?? "Sin resultados"}</div>
              </td>
            </tr>
          ) : (
            rows.map((r, i) => {
              const k = rowKey ? (r[rowKey] as string | number) : i;
              const selected = k === props.selectedKey;
              return (
                <tr
                  key={k}
                  className={cx(selected && "es-table__row--selected")}
                  aria-selected={onRowClick ? selected : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(r);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cx(c.align === "right" && "es-align-right", c.mono && "es-data")}>
                      {c.render ? c.render(r) : (r as Record<string, ReactNode>)[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
