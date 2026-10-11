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
}

/** Lo que el admin escribe de un usuario; sin `clave` se conserva la contraseña. */
export type UsuarioEditable = Omit<Usuario, "id"> & { clave?: string };
