import type { Acreedor, ClienteContrato, Contrato, ContratoNuevo, Copia, EquipoContrato, Periodo } from "./types";

// Reglas de los contratos que comparten el formulario, el documento, el
// registro y el servidor. Sin dependencias del navegador ni de la base.

export const ACREEDOR = { nombre: "ESMER GOMEZ DELGADO", cc: "1.118.559.507" };
/** ELEX COMPANY SAS opera la marca Esgode; firma Esmer Gómez Delgado como representante legal. */
export const ELEX = {
  nombre: "ELEX COMPANY SAS",
  nit: "901395864-1",
  tel: "321 362 1043",
  correo: "esgode@elexcompany.com",
};
export const LUGAR_PAGO = "efectivo, en Carrera 22 # 09-34, Esgode Tech Store.";

export const ACREEDORES: Record<Acreedor, { nombre: string; texto: string }> = {
  esmer: { nombre: "Esmer Gómez Delgado", texto: `Persona natural · C.C. ${ACREEDOR.cc}. Firma como acreedor.` },
  elex: {
    nombre: "Esgode · ELEX",
    texto: `${ELEX.nombre}, NIT ${ELEX.nit}, opera la marca Esgode y responde legalmente. Firma Esmer Gómez Delgado como representante legal.`,
  },
};

export const COPIAS: Copia[] = ["original", "contabilidad", "tienda", "gerencia"];

/** Nombre, uso y banda de cada copia del PDF. */
export function copiaInfo(copia: Copia, tipo: Contrato["tipo"]) {
  const parte = tipo === "compraventa" ? "Vendedor" : "Deudor";
  return {
    original: {
      nombre: `Original · ${parte}`,
      para: "El que recibe el cliente.",
      banda: "ORIGINAL",
      doc: `ORIGINAL · ${parte.toUpperCase()}`,
    },
    contabilidad: {
      nombre: "Soporte 1 · Contabilidad",
      para: "Registro de la cuenta por cobrar.",
      banda: "SOPORTE 1/3",
      doc: "SOPORTE 1 DE 3 · CONTABILIDAD",
    },
    tienda: {
      nombre: "Soporte 2 · Tienda",
      para: "Queda en el punto de venta.",
      banda: "SOPORTE 2/3",
      doc: "SOPORTE 2 DE 3 · TIENDA",
    },
    gerencia: {
      nombre: "Soporte 3 · Gerencia",
      para: "Control y archivo de gerencia.",
      banda: "SOPORTE 3/3",
      doc: "SOPORTE 3 DE 3 · GERENCIA",
    },
  }[copia];
}

/* ---------- Números en letras ---------- */

const U = [
  "",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
  "veintiuno",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
];
const D = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const C = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];
const w99 = (x: number) => (x < 30 ? U[x] : D[Math.floor(x / 10)] + (x % 10 ? " y " + U[x % 10] : ""));
const w999 = (x: number) =>
  x === 100 ? "cien" : [C[Math.floor(x / 100)], x % 100 ? w99(x % 100) : ""].filter(Boolean).join(" ");
const apocope = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");

/** 3600000 → "tres millones seiscientos mil" */
export function palabras(n: number): string {
  n = Math.round(n);
  if (!n) return "cero";
  const mill = Math.floor(n / 1e6);
  const mil = Math.floor((n % 1e6) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (mill) partes.push(mill === 1 ? "un millón" : apocope(palabras(mill)) + " millones");
  if (mil) partes.push(mil === 1 ? "mil" : apocope(w999(mil)) + " mil");
  if (resto) partes.push(w999(resto));
  return partes.join(" ");
}

/** 3600000 → "tres millones seiscientos mil pesos" · 10000000 → "diez millones de pesos" */
export function letras(n: number): string {
  if (n === 1) return "un peso";
  return apocope(palabras(n)) + (n >= 1e6 && n % 1e6 === 0 ? " de" : "") + " pesos";
}

/** "Tres Millones Seiscientos Mil Pesos" (y, de en minúscula) */
export const titulo = (s: string) =>
  s
    .replace(/(^|\s)(\S)/g, (_, a: string, b: string) => a + b.toUpperCase())
    .replace(/ (Y|De) /g, (m) => m.toLowerCase());

/* ---------- Fechas ---------- */

export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-11-05" → fecha local, sin corrimiento por zona horaria. */
export function diaLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isoDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function sumarMeses(d: Date, k: number): Date {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + k);
  return x;
}

export const PERIODOS: { value: Periodo; label: string; plural: string; dias: number | null }[] = [
  { value: "semanal", label: "Semanal", plural: "semanales", dias: 7 },
  { value: "quincenal", label: "Quincenal", plural: "quincenales", dias: 15 },
  { value: "mensual", label: "Mensual", plural: "mensuales", dias: null },
];

/** Fecha de la cuota k: cada 7 días, cada 15 días o el mismo día de cada mes. */
export function sumarPeriodos(d: Date, k: number, periodo: Periodo = "mensual"): Date {
  const dias = PERIODOS.find((p) => p.value === periodo)?.dias;
  if (!dias) return sumarMeses(d, k);
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + k * dias);
  return x;
}

/** La tasa es mensual; para cuotas semanales o quincenales se usa la equivalente del periodo. */
export function tasaPeriodo(tasaMensual: number, periodo: Periodo = "mensual"): number {
  const r = tasaMensual / 100;
  if (periodo === "semanal") return Math.pow(1 + r, 12 / 52) - 1;
  if (periodo === "quincenal") return Math.pow(1 + r, 1 / 2) - 1;
  return r;
}

/** `05 nov 2026` */
export function diaCorto(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/* ---------- Número y plantilla ---------- */

/** "No. 014 del 2026" (acuerdo) · "No. 26-03 del 2026" (compraventa) · "____" sin número (borrador). */
export function numeroCorto(tipo: Contrato["tipo"], anio: number | null, numero: number | null): string {
  if (numero == null || anio == null) return "____";
  return tipo === "compraventa"
    ? `${String(anio).slice(2)}-${String(numero).padStart(2, "0")}`
    : String(numero).padStart(3, "0");
}

export const numeroContrato = (c: Pick<Contrato, "tipo" | "anio" | "numero">) =>
  c.numero == null ? "sin número" : `No. ${numeroCorto(c.tipo, c.anio, c.numero)} del ${c.anio}`;

/** "AP No. 014 del 2026" · "Borrador sin número" */
export const numeroConSigla = (c: Pick<Contrato, "tipo" | "anio" | "numero">) =>
  c.numero == null ? "Borrador sin número" : `${c.tipo === "compraventa" ? "CV" : "AP"} ${numeroContrato(c)}`;

/** "ESG-AP-2026-014", para el pie del PDF. */
export const codigoContrato = (c: Pick<Contrato, "tipo" | "anio" | "numero">) =>
  `ESG-${c.tipo === "compraventa" ? "CV" : "AP"}-${c.anio ?? new Date().getFullYear()}-${numeroCorto(c.tipo, c.anio, c.numero)}`;

/** Fecha que lleva el documento: la de la aprobación; el borrador muestra la de hoy. */
export const fechaDocumento = (c: Pick<Contrato, "aprobadoEn">) => (c.aprobadoEn ? new Date(c.aprobadoEn) : new Date());

export type Plantilla = "cuotas-sin" | "cuotas-con" | "unico-sin" | "unico-con" | "compraventa";

export function plantillaDe(c: Pick<ContratoNuevo, "tipo" | "forma" | "conIntereses">): Plantilla {
  if (c.tipo === "compraventa") return "compraventa";
  return `${c.forma}-${c.conIntereses ? "con" : "sin"}` as Plantilla;
}

export function nombrePlantilla(c: Pick<ContratoNuevo, "tipo" | "forma" | "conIntereses">): string {
  if (c.tipo === "compraventa") return "Contrato de compraventa";
  return `Acuerdo de pago ${c.forma === "cuotas" ? "a cuotas" : "a un solo pago"} ${c.conIntereses ? "con" : "sin"} intereses corrientes`;
}

/** "Cuotas · sin interés", para la tabla del registro. */
export function tipoCorto(c: Pick<ContratoNuevo, "tipo" | "forma" | "conIntereses">): string {
  if (c.tipo === "compraventa") return "Compraventa";
  return `${c.forma === "cuotas" ? "Cuotas" : "Un pago"} · ${c.conIntereses ? "con" : "sin"} interés`;
}

export const equipoCorto = (e: EquipoContrato) => [e.modelo, e.capacidad].filter(Boolean).join(" · ");

/* ---------- Plan de pagos ---------- */

export interface Cuota {
  fecha: Date;
  valor: number;
  /** "Capital" e "Intereses" en el pago único con intereses; si no, null. */
  concepto: string | null;
}

/** Meses completos aproximados entre la firma y el pago único (mínimo 1). */
export function mesesHasta(firma: Date, pago: Date): number {
  return Math.max(1, Math.round((pago.getTime() - firma.getTime()) / (30.4 * 864e5)));
}

/** Total de intereses del pago único si el asesor no lo cambia. */
export const interesesCalculados = (capital: number, tasa: number, firma: Date, pago: Date) =>
  Math.round(capital * (tasa / 100) * mesesHasta(firma, pago));

/** Valores de las cuotas: con intereses, amortización francesa con la tasa del periodo; sin intereses, partes iguales y la última ajusta. */
export function valoresCuotas(
  capital: number,
  n: number,
  tasa: number,
  conIntereses: boolean,
  periodo: Periodo = "mensual",
): number[] {
  const r = tasaPeriodo(tasa, periodo);
  const cuota = conIntereses && r > 0 ? Math.round((capital * r) / (1 - Math.pow(1 + r, -n))) : Math.round(capital / n);
  return Array.from({ length: n }, (_, i) =>
    !(conIntereses && r > 0) && i === n - 1 ? capital - cuota * (n - 1) : cuota,
  );
}

/** Lo que paga el deudor y cuándo. La compraventa no tiene plan. */
export function planDe(
  c: Pick<ContratoNuevo, "tipo" | "forma" | "conIntereses" | "capital" | "nCuotas" | "fechaPago" | "intereses"> & {
    periodo?: Periodo;
  },
  tasa: number,
  firma: Date,
): Cuota[] {
  if (c.tipo === "compraventa" || !c.capital || !c.fechaPago) return [];
  const base = diaLocal(c.fechaPago);
  if (c.forma === "cuotas") {
    return valoresCuotas(c.capital, c.nCuotas, tasa, c.conIntereses, c.periodo).map((valor, i) => ({
      fecha: sumarPeriodos(base, i, c.periodo),
      valor,
      concepto: null,
    }));
  }
  if (!c.conIntereses) return [{ fecha: base, valor: c.capital, concepto: null }];
  const intereses = c.intereses ?? interesesCalculados(c.capital, tasa, firma, base);
  return [
    { fecha: base, valor: c.capital, concepto: "Capital" },
    { fecha: base, valor: intereses, concepto: "Intereses" },
  ];
}

/** Las cuotas que se cobran una por una: el pago único con intereses es un solo pago. */
export function cobrosDe(c: Contrato): Cuota[] {
  const plan = planDe(c, c.tasa, fechaDocumento(c));
  if (c.forma === "unico" && plan.length > 1) {
    return [{ fecha: plan[0].fecha, valor: plan.reduce((a, p) => a + p.valor, 0), concepto: null }];
  }
  return plan;
}

/* ---------- Estado ---------- */

export type EstadoContrato = "borrador" | "porfirmar" | "aldia" | "mora" | "pagado" | "cerrado" | "anulado";

export const ESTADOS: Record<
  EstadoContrato,
  { nombre: string; tono: "neutral" | "accent" | "success" | "warning" | "danger" }
> = {
  borrador: { nombre: "Borrador", tono: "neutral" },
  porfirmar: { nombre: "Aprobado · por firmar", tono: "warning" },
  aldia: { nombre: "Al día", tono: "accent" },
  mora: { nombre: "En mora", tono: "danger" },
  pagado: { nombre: "Pagado", tono: "success" },
  cerrado: { nombre: "Cerrado", tono: "neutral" },
  anulado: { nombre: "Anulado", tono: "danger" },
};

export const ETAPAS = ["Borrador", "Aprobado", "Firmado"] as const;
export const indiceEtapa = (c: Pick<Contrato, "etapa">) => ({ borrador: 0, aprobado: 1, firmado: 2 })[c.etapa];

const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Cuotas vencidas sin pagar: las que pasaron su fecha después de las pagadas. */
export function vencidas(c: Contrato, hoy = new Date()): Cuota[] {
  return cobrosDe(c)
    .slice(c.pagos.length)
    .filter((q) => q.fecha < inicioDelDia(hoy));
}

export function estadoDe(c: Contrato, hoy = new Date()): EstadoContrato {
  if (c.anulado) return "anulado";
  if (c.etapa === "borrador") return "borrador";
  if (c.etapa === "aprobado") return "porfirmar";
  if (c.tipo === "compraventa") return "cerrado";
  if (c.pagos.length >= cobrosDe(c).length) return "pagado";
  return vencidas(c, hoy).length ? "mora" : "aldia";
}

/* ---------- Validación ---------- */

export const PASOS = ["Tipo de contrato", "Cliente", "Equipo", "Condiciones"];

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const digitos = (s: string) => s.replace(/[^0-9]/g, "");

/** En los acuerdos el capital es lo que se financia: valor del producto menos la cuota inicial. */
export function capitalDe(d: Pick<ContratoNuevo, "tipo" | "precio" | "inicial" | "capital">): number {
  if (d.tipo === "compraventa" || d.precio == null) return d.capital;
  return Math.max(0, d.precio - (d.inicial ?? 0));
}

export const llevaImei = (q: Pick<EquipoContrato, "categoria">) =>
  q.categoria === "celular" || q.categoria === "tablet";

/** Errores por campo del paso (1 a 4); cada uno dice cómo corregirlo. Sin paso, todos. */
export function erroresContrato(d: ContratoNuevo, paso?: number, usura?: number | null): Record<string, string> {
  const e: Record<string, string> = {};
  const compra = d.tipo === "compraventa";
  const en = (p: number) => !paso || paso === p;
  if (en(2)) {
    const c: ClienteContrato = d.cliente;
    if (c.nombre.trim().split(/\s+/).length < 2) e.nombre = "Escribe nombre y apellidos, como en la cédula.";
    if (digitos(c.cc).length < 5 || digitos(c.cc).length > 12) e.cc = "Escribe el número de cédula, solo números.";
    if (!c.exp.trim()) e.exp = "Escribe la ciudad donde se expidió la cédula.";
    if (!c.ciudad.trim()) e.ciudad = "Escribe la ciudad donde vive.";
    if (!c.dir.trim()) e.dir = "Escribe la dirección de residencia para continuar.";
    if (!CORREO.test(c.correo.trim())) e.correo = "Escribe un correo válido, por ejemplo nombre@correo.com.";
    if (digitos(c.cel).length !== 10) e.cel = "Escribe el celular de 10 dígitos, por ejemplo 300 123 4567.";
  }
  if (en(3)) {
    const q: EquipoContrato = d.equipo;
    if (!q.marca.trim()) e.marca = "Escribe la marca.";
    if (!q.modelo.trim()) e.modelo = "Escribe el modelo.";
    if (compra && !q.serial.trim()) e.serial = "En la compraventa el serial es obligatorio.";
    if (llevaImei(q)) {
      (q.imeis ?? []).forEach((v, i) => {
        const n = digitos(v).length;
        if (n && n !== 15) e[`imei${i}`] = "El IMEI tiene 15 dígitos.";
      });
      if (compra && digitos(q.imeis?.[0] ?? "").length === 0) e.imei0 = "En la compraventa el IMEI 1 es obligatorio.";
    }
  }
  if (en(4)) {
    if (!compra && d.precio != null) {
      if (!Number.isInteger(d.precio) || d.precio < 1000 || d.precio > 9_999_999_999)
        e.precio = "Escribe el valor del producto en pesos, sin decimales.";
      else if (!Number.isInteger(d.inicial ?? 0) || (d.inicial ?? 0) < 0 || (d.inicial ?? 0) >= d.precio)
        e.inicial = "La cuota inicial debe ser menor que el valor del producto.";
    }
    const capital = capitalDe(d);
    if (!e.precio && !e.inicial && (!Number.isInteger(capital) || capital < 1000 || capital > 9_999_999_999))
      e[compra || d.precio == null ? "capital" : "precio"] =
        compra || d.precio == null
          ? "Escribe el valor en pesos, sin decimales."
          : "El capital a financiar debe ser de al menos $ 1.000.";
    if (!compra) {
      if (d.forma === "cuotas" && !(Number.isInteger(d.nCuotas) && d.nCuotas >= 2 && d.nCuotas <= 12))
        e.nCuotas = "Elige entre 2 y 12 cuotas.";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fechaPago)) e.fechaPago = "Elige la fecha de pago.";
      else if (diaLocal(d.fechaPago) <= inicioDelDia(new Date())) e.fechaPago = "Elige una fecha posterior a hoy.";
      if (d.conIntereses) {
        if (!(d.tasa > 0 && d.tasa <= 10)) e.tasa = "Escribe la tasa mensual, por ejemplo 1,9.";
        else if (usura != null && d.tasa > usura)
          e.tasa = `La tasa supera la usura del mes (${String(usura).replace(".", ",")} % mensual). Escribe una menor.`;
        if (!d.mesTasa.trim()) e.mesTasa = "Escribe el mes de la tasa, por ejemplo octubre.";
      }
      if (d.intereses != null && !(Number.isInteger(d.intereses) && d.intereses >= 0))
        e.intereses = "Escribe el total de intereses en pesos.";
    } else if (!(Number.isInteger(d.diasDevolucion) && d.diasDevolucion! >= 1 && d.diasDevolucion! <= 365)) {
      e.diasDevolucion = "Escribe un número de días entre 1 y 365.";
    }
  }
  return e;
}

/** Pasos del formulario que ya no tienen errores, para el progreso del borrador. */
export const pasoCompleto = (d: ContratoNuevo, paso: number) => Object.keys(erroresContrato(d, paso)).length === 0;

/** Lo que falta para poder aprobar, en el orden del formulario. */
export const faltantes = (d: ContratoNuevo, usura?: number | null) =>
  Object.values(erroresContrato(d, undefined, usura));

/* ---------- Limpieza ---------- */

const texto = (v: unknown, max = 160) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const entero = (v: unknown, max = 9_999_999_999) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

/** Deja solo valores con la forma esperada; no exige que estén completos (el borrador se guarda a medias). */
export function limpiarContrato(d: ContratoNuevo): ContratoNuevo {
  const c = d?.cliente ?? ({} as ClienteContrato);
  const q = d?.equipo ?? ({} as EquipoContrato);
  const compra = d?.tipo === "compraventa";
  const conIntereses = !compra && d.conIntereses === true;
  const limpio: ContratoNuevo = {
    tipo: compra ? "compraventa" : "acuerdo",
    acreedor: d?.acreedor === "elex" ? "elex" : "esmer",
    forma: !compra && d.forma === "unico" ? "unico" : "cuotas",
    conIntereses,
    cliente: {
      trato: c.trato === "sr" ? "sr" : "sra",
      nombre: texto(c.nombre, 120),
      cc: texto(c.cc, 20),
      exp: texto(c.exp, 60),
      ciudad: texto(c.ciudad, 60),
      dir: texto(c.dir),
      correo: texto(c.correo, 120),
      cel: texto(c.cel, 20),
    },
    equipo: {
      categoria: (["celular", "tablet", "portatil", "otro"] as const).find((x) => x === q.categoria) ?? "otro",
      marca: texto(q.marca, 60),
      modelo: texto(q.modelo, 80),
      color: texto(q.color, 40),
      capacidad: texto(q.capacidad, 60),
      estado: (["nuevo", "seminuevo", "usado"] as const).find((x) => x === q.estado) ?? "nuevo",
      serial: texto(q.serial, 60),
      imeis: (Array.isArray(q.imeis) ? q.imeis : []).slice(0, 4).map((v) => texto(v, 20).replace(/[^0-9]/g, "")),
    },
    precio: compra || d.precio == null ? null : entero(d.precio),
    inicial: compra || d.precio == null ? null : entero(d.inicial),
    capital: entero(d?.capital),
    nCuotas: compra || d.forma === "unico" ? 1 : Math.min(entero(d.nCuotas, 99), 99),
    periodo: (["mensual", "quincenal", "semanal"] as const).find((x) => x === d?.periodo) ?? "mensual",
    fechaPago: compra ? "" : /^\d{4}-\d{2}-\d{2}$/.test(String(d.fechaPago)) ? String(d.fechaPago) : "",
    tasa: conIntereses ? Math.round(Math.min(Math.max(Number(d.tasa) || 0, 0), 99) * 1000) / 1000 : 0,
    mesTasa: texto(d?.mesTasa, 20),
    intereses: !compra && d.forma === "unico" && conIntereses && d.intereses != null ? entero(d.intereses) : null,
    diasDevolucion: compra ? Math.min(entero(d.diasDevolucion, 999), 999) || null : null,
  };
  limpio.capital = capitalDe(limpio);
  return limpio;
}
