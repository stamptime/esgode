const miles = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const porcentaje = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/** `$ 1.899.900` — espacio tras el signo, punto de miles, sin decimales. */
export function cop(n: number): string {
  return "$ " + miles.format(Math.round(n));
}

/** `2,1 %` */
export function pct(n: number): string {
  return porcentaje.format(n) + " %";
}

/** Número con coma decimal para campos editables: 2.1 → "2,1". */
export function decimalATexto(n: number): string {
  return String(n).replace(".", ",");
}

export function textoADecimal(txt: string): number {
  return Number(txt.trim().replace(",", "."));
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dos = (n: number) => String(n).padStart(2, "0");

export function hora(iso: string): string {
  const d = new Date(iso);
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function esHoy(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

/** `10 oct 2026` */
export function fecha(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** `hoy, 08:14` el mismo día; `10 oct 2026, 08:14` después. */
export function fechaHora(iso: string): string {
  return `${esHoy(iso) ? "hoy" : fecha(iso)}, ${hora(iso)}`;
}

export const nombreDe = (lista: { id: string; nombre: string }[], id: string) =>
  lista.find((x) => x.id === id)?.nombre ?? "";
