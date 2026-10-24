"use client";

import { Catalogo, arrastre, cuenta, igual } from "@/components/admin/Catalogo";
import { actualizarFinanciera, crearFinanciera, eliminarFinanciera, useStore } from "@/lib/store";
import type { Financiera } from "@/lib/types";

export default function FinancierasPage() {
  const { listo, financieras, tasas } = useStore();
  if (!listo) return null;
  const de = (f: Financiera) => tasas.filter((t) => t.financieraId === f.id);

  return (
    <Catalogo<Financiera>
      titulo="Financieras"
      subtitulo="Las entidades con las que financias. Sus tasas se definen en Tasas."
      textos={{
        nuevo: "Nueva financiera",
        crear: "Crear financiera",
        guardar: "Guardar financiera",
        eliminar: "Eliminar financiera",
        conservar: "Conservar financiera",
        buscar: "Buscar financiera",
        vacio: "Aún no hay financieras. Crea la primera con «Nueva financiera».",
      }}
      columnas={[
        { key: "nombre", label: "Financiera" },
        { key: "tasas", label: "Tasas", align: "right", mono: true, render: (f) => de(f).length },
        {
          key: "activas",
          label: "Activas",
          align: "right",
          mono: true,
          render: (f) => de(f).filter((t) => t.activa).length,
        },
      ]}
      tarjeta={(f) => ({ titulo: f.nombre, detalle: cuenta(de(f).length, "tasa", "tasas") })}
      filas={financieras}
      textoDe={(f) => f.nombre}
      nombreDe={(f) => f.nombre}
      campos={[{ clave: "nombre", etiqueta: "Nombre", tipo: "texto", placeholder: "Crédito Fácil" }]}
      valoresDe={(f) => ({ nombre: f?.nombre ?? "" })}
      validar={(v, actual) => {
        const nombre = String(v.nombre);
        if (!nombre.trim()) return { nombre: "Escribe el nombre de la financiera." };
        if (financieras.some((f) => f.id !== actual?.id && igual(f.nombre, nombre)))
          return { nombre: "Ya hay una financiera con ese nombre; escribe uno distinto." };
        return {};
      }}
      guardar={(v, actual) => {
        const nombre = String(v.nombre).trim();
        if (!actual) return crearFinanciera(nombre);
        return actualizarFinanciera(actual.id, nombre);
      }}
      eliminar={(f) => eliminarFinanciera(f.id)}
      avisoEliminar={(f) => arrastre([cuenta(de(f).length, "tasa", "tasas")], "No tiene tasas. No se puede deshacer.")}
    />
  );
}
