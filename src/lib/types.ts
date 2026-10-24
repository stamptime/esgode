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

export type TasaEditable = Pick<Tasa, "tipo" | "tasa" | "plazos" | "inicialMin" | "activa">;

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
export type Copia = "original" | "contabilidad" | "tienda" | "gerencia";
/** Quién firma por Esgode: Esmer Gómez Delgado (persona natural) o ELEX COMPANY SAS, que opera la marca. */
export type Acreedor = "esmer" | "elex";
export type Periodo = "mensual" | "quincenal" | "semanal";
/** Borrador: se edita, sin número · Aprobado: número asignado, bloqueado · Firmado: definitivo. */
export type Etapa = "borrador" | "aprobado" | "firmado";

export interface ClienteContrato {
  trato: "sr" | "sra";
  nombre: string;
  cc: string;
  exp: string; // ciudad de expedición de la cédula
  ciudad: string;
  dir: string; // dirección de residencia, obligatoria
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
  imeis: string[]; // celulares y tablets, hasta 4; el primero es obligatorio en compraventa
}

/** Lo que el asesor llena en el formulario. */
export interface ContratoNuevo {
  tipo: TipoContrato;
  acreedor: Acreedor;
  forma: FormaPago; // solo acuerdos; la compraventa se paga a la firma
  conIntereses: boolean;
  cliente: ClienteContrato;
  equipo: EquipoContrato;
  precio: number | null; // acuerdos: valor del producto; null en contratos anteriores
  inicial: number | null; // acuerdos: cuota inicial
  capital: number; // pesos; en acuerdos, precio − inicial; en compraventa, el valor de compra
  nCuotas: number; // 1 en pago único
  periodo: Periodo; // periodicidad de las cuotas
  fechaPago: string; // YYYY-MM-DD: primera cuota o pago único
  tasa: number; // % mensual que aplica a este contrato; 0 sin intereses
  mesTasa: string; // "octubre", como va en la cláusula de intereses
  intereses: number | null; // total de intereses del pago único; null = calculado
  diasDevolucion: number | null; // compraventa
}

/** Quién y cuándo. */
export interface Registro {
  en: string; // ISO
  por: string;
}

/** Foto guardada en el almacenamiento privado; se ve por /api/contratos/<id>/fotos/<archivo>. */
export interface Foto extends Registro {
  archivo: string;
}

export type FotoCedula = "cedulaFrente" | "cedulaReverso";
export type FotoEquipo = "frente" | "reverso" | "pantalla" | "detalle";
/** Huecos de una sola foto; las entregas son una lista. */
export type HuecoFoto = FotoCedula | FotoEquipo | "firmado";

export interface Fotos {
  cedulaFrente?: Foto;
  cedulaReverso?: Foto;
  frente?: Foto;
  reverso?: Foto;
  pantalla?: Foto;
  detalle?: Foto;
  firmado?: Foto; // foto del original firmado en papel
  entregas?: Foto[]; // evidencia de entrega (o recepción) del equipo
}

export interface Contrato extends ContratoNuevo {
  id: string;
  etapa: Etapa;
  paso: number; // último paso del formulario en el borrador (1 a 4)
  anio: number | null; // se fija al aprobar por primera vez
  numero: number | null; // consecutivo por tipo y año, asignado al aprobar
  aprobadoEn: string | null;
  aprobadoPor: string | null;
  firma: FormaFirma;
  firmaTrazo: string | null; // path SVG de la firma en el celular
  firmaLienzo: string; // "ancho alto" del lienzo de la firma, p. ej. "800 260"
  firmadoEn: string | null;
  firmaDispositivo: string | null;
  verificacion: string | null; // código impreso en el pie del PDF firmado
  pagos: Registro[]; // uno por cuota pagada, en orden
  copias: Partial<Record<Copia, Registro>>; // última descarga de cada copia
  fotos: Fotos;
  anulado: boolean;
  motivoAnulacion: string | null;
  creadoEn: string;
  creadoPor: string;
  editadoEn: string;
  editadoPor: string;
}

/** Tasa propia de Esgode para los acuerdos con intereses. */
export interface AjustesContratos {
  tasa: number; // % mensual sugerido
  usura: number | null; // % mensual máximo legal del mes, si administración lo registró
}
