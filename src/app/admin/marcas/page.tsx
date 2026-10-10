"use client";

import { Catalogo, arrastre, cuenta, igual } from "@/components/admin/Catalogo";
import { nombreDe } from "@/lib/formato";
import { actualizarMarca, crearMarca, eliminarMarca, useStore } from "@/lib/store";
import type { Marca } from "@/lib/types";

export default function MarcasPage() {
  const { listo, categorias, marcas, tasas, productos } = useStore();
  if (!listo) return null;
  const de = <T extends { marcaId: string }>(lista: T[], m: Marca) =>
    lista.filter((x) => x.marcaId === m.id).length;

  return (
    <Catalogo<Marca>
      titulo="Marcas"
      subtitulo="Cada marca vive dentro de una categoría; las tasas se definen por marca."
      textos={{
        nuevo: "Nueva marca",
        crear: "Crear marca",
        guardar: "Guardar marca",
        eliminar: "Eliminar marca",
        conservar: "Conservar marca",
        buscar: "Buscar marca o categoría",
        vacio: "Aún no hay marcas. Crea la primera con «Nueva marca».",
      }}
      bloqueo={
        categorias.length ? undefined : "Crea primero una categoría; las marcas se agregan dentro de ella."
      }
      columnas={[
        { key: "nombre", label: "Marca" },
        { key: "categoria", label: "Categoría", render: (m) => nombreDe(categorias, m.categoriaId) },
        { key: "productos", label: "Productos", align: "right", mono: true, render: (m) => de(productos, m) },
        { key: "tasas", label: "Tasas", align: "right", mono: true, render: (m) => de(tasas, m) },
      ]}
      filas={marcas}
      textoDe={(m) => `${m.nombre} ${nombreDe(categorias, m.categoriaId)}`}
      nombreDe={(m) => `${m.nombre} · ${nombreDe(categorias, m.categoriaId)}`}
      campos={[
        { clave: "nombre", etiqueta: "Nombre", tipo: "texto", placeholder: "Samsung" },
        {
          clave: "categoriaId",
          etiqueta: "Categoría",
          tipo: "opcion",
          soloAlCrear: true,
          opciones: categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre })),
        },
      ]}
      valoresDe={(m) => ({ nombre: m?.nombre ?? "", categoriaId: m?.categoriaId ?? categorias[0]?.id ?? "" })}
      validar={(v, actual) => {
        const nombre = String(v.nombre);
        if (!nombre.trim()) return { nombre: "Escribe el nombre de la marca, por ejemplo Samsung." };
        if (
          marcas.some(
            (m) => m.id !== actual?.id && m.categoriaId === v.categoriaId && igual(m.nombre, nombre),
          )
        )
          return {
            nombre: "Esa marca ya existe en la categoría; escribe otro nombre o elige otra categoría.",
          };
        if (!v.categoriaId) return { categoriaId: "Elige la categoría de la marca." };
        return {};
      }}
      guardar={(v, actual) => {
        const nombre = String(v.nombre).trim();
        if (!actual) return crearMarca(String(v.categoriaId), nombre);
        return actualizarMarca(actual.id, nombre);
      }}
      eliminar={(m) => eliminarMarca(m.id)}
      avisoEliminar={(m) =>
        arrastre(
          [cuenta(de(productos, m), "producto", "productos"), cuenta(de(tasas, m), "tasa", "tasas")],
          "No tiene productos ni tasas. No se puede deshacer.",
        )
      }
    />
  );
}
