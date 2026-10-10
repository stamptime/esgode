"use client";

import { Catalogo, arrastre, cuenta, igual } from "@/components/admin/Catalogo";
import { actualizarCategoria, crearCategoria, eliminarCategoria, useStore } from "@/lib/store";
import type { Categoria } from "@/lib/types";

export default function CategoriasPage() {
  const { listo, categorias, marcas, tasas, productos } = useStore();
  if (!listo) return null;
  const de = <T extends { categoriaId: string }>(lista: T[], c: Categoria) =>
    lista.filter((x) => x.categoriaId === c.id).length;

  return (
    <Catalogo<Categoria>
      titulo="Categorías"
      subtitulo="Los tipos de producto que vendes. Cada marca y cada tasa pertenece a una."
      textos={{
        nuevo: "Nueva categoría",
        crear: "Crear categoría",
        guardar: "Guardar categoría",
        eliminar: "Eliminar categoría",
        conservar: "Conservar categoría",
        buscar: "Buscar categoría",
        vacio: "Aún no hay categorías. Crea la primera con «Nueva categoría».",
      }}
      columnas={[
        { key: "nombre", label: "Categoría" },
        { key: "marcas", label: "Marcas", align: "right", mono: true, render: (c) => de(marcas, c) },
        { key: "productos", label: "Productos", align: "right", mono: true, render: (c) => de(productos, c) },
        { key: "tasas", label: "Tasas", align: "right", mono: true, render: (c) => de(tasas, c) },
      ]}
      tarjeta={(c) => ({
        titulo: c.nombre,
        detalle: `${cuenta(de(marcas, c), "marca", "marcas")} · ${cuenta(de(tasas, c), "tasa", "tasas")}`,
      })}
      filas={categorias}
      textoDe={(c) => c.nombre}
      nombreDe={(c) => c.nombre}
      campos={[{ clave: "nombre", etiqueta: "Nombre", tipo: "texto", placeholder: "Celulares" }]}
      valoresDe={(c) => ({ nombre: c?.nombre ?? "" })}
      validar={(v, actual) => {
        const nombre = String(v.nombre);
        if (!nombre.trim()) return { nombre: "Escribe el nombre de la categoría, por ejemplo Celulares." };
        if (categorias.some((c) => c.id !== actual?.id && igual(c.nombre, nombre)))
          return { nombre: "Ya hay una categoría con ese nombre; escribe uno distinto." };
        return {};
      }}
      guardar={(v, actual) => {
        const nombre = String(v.nombre).trim();
        if (!actual) return crearCategoria(nombre);
        return actualizarCategoria(actual.id, nombre);
      }}
      eliminar={(c) => eliminarCategoria(c.id)}
      avisoEliminar={(c) =>
        arrastre(
          [
            cuenta(de(marcas, c), "marca", "marcas"),
            cuenta(de(productos, c), "producto", "productos"),
            cuenta(de(tasas, c), "tasa", "tasas"),
          ],
          "No tiene marcas, productos ni tasas. No se puede deshacer.",
        )
      }
    />
  );
}
