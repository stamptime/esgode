// Modelo de datos del handoff (docs/handoff/HANDOFF.md).

export type TipoTasa = "mensual" | "ea"; // mensual o efectiva anual
export type Rol = "admin" | "staff";

export interface Usuario {
  id: string;
  usuario: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
}

export interface Categoria {
  id: string;
  nombre: string;
}

export interface Marca {
  id: string;
  categoriaId: string;
  nombre: string;
}

export interface Financiera {
  id: string;
  nombre: string;
}

export interface Producto {
  id: string;
  categoriaId: string;
  marcaId: string;
  nombre: string;
  precio: number; // pesos, sin decimales
  activo: boolean; // solo los activos aparecen en la calculadora
}

// Unicidad: una Tasa por (categoriaId, marcaId, financieraId).
export interface Tasa {
  id: string;
  categoriaId: string;
  marcaId: string;
  financieraId: string;
  tipo: TipoTasa;
  tasa: number; // porcentaje, p. ej. 2.1
  plazos: number[]; // meses permitidos, p. ej. [6, 12, 18, 24]
  inicialMin: number; // % de cuota inicial mínima, 0 si no aplica
  activa: boolean; // solo las activas aparecen en la calculadora
  actualizadoEn: string; // ISO
  actualizadoPor: string;
}

export type TasaEditable = Pick<
  Tasa,
  "tipo" | "tasa" | "plazos" | "inicialMin" | "activa"
>;

/** Lo que el admin configura. */
export interface Datos {
  categorias: Categoria[];
  marcas: Marca[];
  financieras: Financiera[];
  productos: Producto[];
  tasas: Tasa[];
  usuarios: Usuario[]; // solo llega a los admin; vacío para staff
  ajustes: AjustesContratos;
}

/** Lo que el admin escribe de un usuario; sin `clave` se conserva la contraseña. */
export type UsuarioEditable = Omit<Usuario, "id"> & { clave?: string };

/* ---------- Contratos ---------- */

export type TipoContrato = "acuerdo" | "compraventa"; // acuerdo: Esgode vende a crédito · compraventa: Esgode compra
export type FormaPago = "cuotas" | "unico";
export type FormaFirma = "pendiente" | "digital" | "papel";
export type Copia = "original" | "cartera" | "contabilidad" | "archivo";

export interface ClienteContrato {
  trato: "sr" | "sra";
  nombre: string;
  cc: string;
  exp: string; // ciudad de expedición de la cédula
  ciudad: string;
  dir: string; // obligatoria en compraventa
  correo: string;
  cel: string;
}

export interface EquipoContrato {
  categoria: "celular" | "tablet" | "portatil" | "otro";
  marca: string;
  modelo: string;
  color: string;
  capacidad: string;
  estado: "nuevo" | "seminuevo" | "usado";
  serial: string; // obligatorio en compraventa
}

/** Lo que el asesor llena en el formulario. */
export interface ContratoNuevo {
  tipo: TipoContrato;
  forma: FormaPago; // solo acuerdos; la compraventa se paga a la firma
  conIntereses: boolean;
  cliente: ClienteContrato;
  equipo: EquipoContrato;
  capital: number; // pesos; en compraventa, el valor de compra
  nCuotas: number; // 1 en pago único
  fechaPago: string; // YYYY-MM-DD: primera cuota o pago único
  mesTasa: string; // "octubre", como va en la cláusula de intereses
  intereses: number | null; // total de intereses del pago único; null = calculado
  diasDevolucion: number | null; // compraventa
}

/** Quién y cuándo. */
export interface Registro {
  en: string; // ISO
  por: string;
}

export interface Contrato extends ContratoNuevo {
  id: string;
  anio: number;
  numero: number; // consecutivo por tipo y año
  tasa: number; // % mensual vigente al crear; 0 sin intereses
  firma: FormaFirma;
  firmaTrazo: string | null; // path SVG de la firma en el celular (358 × 168)
  firmadoEn: string | null;
  firmaDispositivo: string | null;
  verificacion: string | null; // código impreso en el pie del PDF firmado
  pagos: Registro[]; // uno por cuota pagada, en orden
  copias: Partial<Record<Copia, Registro>>; // última descarga de cada copia
  anulado: boolean;
  creadoEn: string;
  creadoPor: string;
}

/** Tasa propia de Esgode para los acuerdos con intereses. */
export interface AjustesContratos {
  tasa: number; // % mensual
  usura: number | null; // % mensual máximo legal del mes, si administración lo registró
}
