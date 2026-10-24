"use client";

import { Catalogo, igual } from "@/components/admin/Catalogo";
import { Badge } from "@/components/ui";
import { cop } from "@/lib/formato";
import { nombreDe } from "@/lib/formato";
import { actualizarProducto, crearProducto, eliminarProducto, useStore } from "@/lib/store";
import type { Producto } from "@/lib/types";

export default function ProductosPage() {
  const { listo, categorias, marcas, productos } = useStore();
  if (!listo) return null;

  return (
    <Catalogo<Producto>
      titulo="Productos"
      subtitulo="El staff los elige en la calculadora para cargar el precio sin escribirlo."
      textos={{
        nuevo: "Nuevo producto",
        crear: "Crear producto",
        guardar: "Guardar producto",
        eliminar: "Eliminar producto",
        conservar: "Conservar producto",
        buscar: "Buscar producto o marca",
        vacio: "Aún no hay productos. Crea el primero con «Nuevo producto».",
      }}
      bloqueo={marcas.length ? undefined : "Crea primero una marca; cada producto pertenece a una."}
      columnas={[
        { key: "nombre", label: "Producto" },
        { key: "marca", label: "Marca", render: (p) => nombreDe(marcas, p.marcaId) },
        { key: "categoria", label: "Categoría", render: (p) => nombreDe(categorias, p.categoriaId) },
        { key: "precio", label: "Precio", align: "right", mono: true, render: (p) => cop(p.precio) },
        {
          key: "activo",
          label: "Estado",
          render: (p) => <Badge tone={p.activo ? "success" : "neutral"}>{p.activo ? "Activo" : "Inactivo"}</Badge>,
        },
      ]}
      tarjeta={(p) => ({
        titulo: p.nombre,
        detalle: `${nombreDe(marcas, p.marcaId)} · ${nombreDe(categorias, p.categoriaId)}`,
        lado: (
          <>
            <span className="data">{cop(p.precio)}</span>
            {p.activo ? null : <Badge>Inactivo</Badge>}
          </>
        ),
      })}
      filas={productos}
      textoDe={(p) => `${p.nombre} ${nombreDe(marcas, p.marcaId)} ${nombreDe(categorias, p.categoriaId)}`}
      nombreDe={(p) => p.nombre}
      campos={[
        { clave: "nombre", etiqueta: "Nombre", tipo: "texto", placeholder: "Galaxy A55 256 GB" },
        {
          clave: "marcaId",
          etiqueta: "Marca",
          tipo: "opcion",
          opciones: marcas.map((m) => ({
            valor: m.id,
            etiqueta: `${m.nombre} · ${nombreDe(categorias, m.categoriaId)}`,
          })),
        },
        {
          clave: "precio",
          etiqueta: "Precio",
          tipo: "dinero",
          placeholder: "$ 0",
          ayuda: "Precio de venta sin descuentos.",
        },
        { clave: "activo", etiqueta: "Producto visible en la calculadora", tipo: "interruptor" },
      ]}
      valoresDe={(p) => ({
        nombre: p?.nombre ?? "",
        marcaId: p?.marcaId ?? marcas[0]?.id ?? "",
        precio: p ? String(p.precio) : "",
        activo: p?.activo ?? true,
      })}
      validar={(v, actual) => {
        const errores: Record<string, string> = {};
        const nombre = String(v.nombre);
        if (!nombre.trim()) errores.nombre = "Escribe el nombre del producto, por ejemplo Galaxy A55 256 GB.";
        else if (productos.some((p) => p.id !== actual?.id && p.marcaId === v.marcaId && igual(p.nombre, nombre)))
          errores.nombre = "Ese producto ya existe en la marca; escribe otro nombre.";
        if (!v.marcaId) errores.marcaId = "Elige la marca del producto.";
        if (!(Number(v.precio) > 0)) errores.precio = "Escribe el precio en pesos, por ejemplo $ 1.899.900.";
        return errores;
      }}
      guardar={(v, actual) => {
        const marcaId = String(v.marcaId);
        const datos = {
          nombre: String(v.nombre).trim(),
          marcaId,
          precio: Number(v.precio),
          activo: v.activo === true,
        };
        if (!actual) return crearProducto(datos);
        return actualizarProducto(actual.id, datos);
      }}
      eliminar={(p) => eliminarProducto(p.id)}
      avisoEliminar={() => "Dejará de aparecer en la calculadora. Si solo quieres ocultarlo, desactívalo."}
    />
  );
}
