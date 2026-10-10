"use client";

import { useState } from "react";
import { Badge, Button, DataTable, SegmentedControl, StatCard, TextField, type DataColumn } from "@/components/ui";
import { esHoy, fecha, hora, pct } from "@/lib/formato";
import { CATEGORIAS, FINANCIERAS, MARCAS, nombreDe } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Tasa } from "@/lib/types";
import { Inspector } from "./Inspector";

type Fila = Tasa & { marca: string; financiera: string };

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const COLUMNAS: DataColumn<Fila>[] = [
  { key: "marca", label: "Marca" },
  { key: "financiera", label: "Financiera" },
  { key: "tipo", label: "Tipo de tasa", render: (r) => (r.tipo === "mensual" ? "Mensual" : "Efectiva anual") },
  { key: "tasa", label: "Tasa", align: "right", mono: true, render: (r) => pct(r.tasa) },
  { key: "plazos", label: "Plazos", mono: true, render: (r) => r.plazos.join(" · ") },
  { key: "inicialMin", label: "Inicial mín.", align: "right", mono: true, render: (r) => `${r.inicialMin} %` },
  {
    key: "activa",
    label: "Estado",
    render: (r) => <Badge tone={r.activa ? "success" : "neutral"}>{r.activa ? "Activa" : "Inactiva"}</Badge>,
  },
];

export default function TasasPage() {
  const { listo, tasas } = useStore();
  const [categoriaId, setCategoriaId] = useState(CATEGORIAS[0].id);
  const [busqueda, setBusqueda] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  if (!listo) return null;

  const categoria = CATEGORIAS.find((c) => c.id === categoriaId) ?? CATEGORIAS[0];
  const enCategoria = tasas.filter((t) => t.categoriaId === categoria.id);
  const q = sinTildes(busqueda.trim());
  const filas: Fila[] = enCategoria
    .map((t) => ({ ...t, marca: nombreDe(MARCAS, t.marcaId), financiera: nombreDe(FINANCIERAS, t.financieraId) }))
    .filter((f) => !q || sinTildes(f.marca).includes(q) || sinTildes(f.financiera).includes(q));
  const sel = creando ? null : (filas.find((f) => f.id === selId) ?? filas[0] ?? null);

  const marcasCat = MARCAS.filter((m) => m.categoriaId === categoria.id);
  const hayLibres = enCategoria.length < marcasCat.length * FINANCIERAS.length;

  const ultima = tasas.reduce<Tasa | null>((max, t) => (!max || t.actualizadoEn > max.actualizadoEn ? t : max), null);
  const porQuien = ultima?.actualizadoPor ? `, por ${ultima.actualizadoPor.split(" ")[0]}` : "";

  return (
    <>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 p-6">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="title-1 m-0">Tasas de crédito</h1>
            <div className="callout text-ink-secondary">
              Lo que definas aquí es lo que el staff ve en la calculadora.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TextField
              className="w-60"
              placeholder="Buscar marca o financiera"
              leading="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <SegmentedControl
              label="Categoría"
              options={CATEGORIAS.map((c) => ({
                value: c.id,
                label: c.nombre,
                count: tasas.filter((t) => t.categoriaId === c.id).length,
              }))}
              value={categoria.id}
              onChange={(v) => {
                setCategoriaId(v);
                setSelId(null);
                setCreando(false);
              }}
            />
            <Button icon="plus" disabled={!hayLibres || creando} onClick={() => setCreando(true)}>
              Nueva tasa
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Tasas activas"
            value={String(enCategoria.filter((t) => t.activa).length)}
            hint={`en ${categoria.nombre.toLowerCase()}`}
          />
          <StatCard
            label="Financieras"
            value={String(FINANCIERAS.length)}
            hint={FINANCIERAS.map((f) => f.nombre).join(" · ")}
          />
          {ultima ? (
            <StatCard
              label="Última actualización"
              value={esHoy(ultima.actualizadoEn) ? hora(ultima.actualizadoEn) : fecha(ultima.actualizadoEn)}
              hint={(esHoy(ultima.actualizadoEn) ? "hoy" : hora(ultima.actualizadoEn)) + porQuien}
            />
          ) : (
            <StatCard label="Última actualización" value="—" />
          )}
        </div>

        <div>
          <DataTable
            className="overflow-x-auto"
            columns={COLUMNAS}
            rows={filas}
            rowKey="id"
            selectedKey={sel?.id}
            onRowClick={(r) => {
              setSelId(r.id);
              setCreando(false);
            }}
            emptyText={
              q
                ? "Ninguna tasa coincide con la búsqueda. Prueba con otra marca o financiera."
                : "No hay tasas en esta categoría. Crea la primera con «Nueva tasa»."
            }
          />
        </div>
      </main>

      {creando ? (
        <Inspector
          key={`nueva-${categoria.id}`}
          categoria={categoria}
          existentes={enCategoria}
          onCreada={(id) => {
            setCreando(false);
            setBusqueda("");
            setSelId(id);
          }}
          onCerrar={() => setCreando(false)}
        />
      ) : sel ? (
        <Inspector
          key={`${sel.id}-${sel.actualizadoEn}`}
          categoria={categoria}
          existentes={enCategoria}
          tasa={sel}
          onCerrar={() => setSelId(null)}
        />
      ) : null}
    </>
  );
}
