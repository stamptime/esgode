"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  DataTable,
  SegmentedControl,
  StatCard,
  TextField,
  type DataColumn,
} from "@/components/ui";
import { esHoy, fecha, hora, pct } from "@/lib/formato";
import { nombreDe } from "@/lib/formato";
import { useStore } from "@/lib/store";
import type { Tasa } from "@/lib/types";
import { ListaMovil } from "@/components/admin/movil";
import { Inspector } from "./Inspector";

type Fila = Tasa & { marca: string; financiera: string };

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const COLUMNAS: DataColumn<Fila>[] = [
  { key: "marca", label: "Marca" },
  { key: "financiera", label: "Financiera" },
  {
    key: "tipo",
    label: "Tipo de tasa",
    render: (r) => (r.tipo === "mensual" ? "Mensual" : "Efectiva anual"),
  },
  { key: "tasa", label: "Tasa", align: "right", mono: true, render: (r) => pct(r.tasa) },
  { key: "plazos", label: "Plazos", mono: true, render: (r) => r.plazos.join(" · ") },
  {
    key: "inicialMin",
    label: "Inicial mín.",
    align: "right",
    mono: true,
    render: (r) => `${r.inicialMin} %`,
  },
  {
    key: "activa",
    label: "Estado",
    render: (r) => <Badge tone={r.activa ? "success" : "neutral"}>{r.activa ? "Activa" : "Inactiva"}</Badge>,
  },
];

export default function TasasPage() {
  const { listo, tasas, categorias, marcas, financieras } = useStore();
  const [categoriaId, setCategoriaId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  if (!listo) return null;

  const categoria = categorias.find((c) => c.id === categoriaId) ?? categorias[0];
  if (!categoria) {
    return (
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="title-3">Aún no hay categorías</div>
        <div className="callout text-ink-secondary">
          Las tasas se definen por categoría, marca y financiera. Crea primero una categoría.
        </div>
        <Link href="/admin/categorias" className="es-btn es-btn--primary es-btn--md mt-4">
          Crear categoría
        </Link>
      </main>
    );
  }
  const enCategoria = tasas.filter((t) => t.categoriaId === categoria.id);
  const q = sinTildes(busqueda.trim());
  const filas: Fila[] = enCategoria
    .map((t) => ({
      ...t,
      marca: nombreDe(marcas, t.marcaId),
      financiera: nombreDe(financieras, t.financieraId),
    }))
    .filter((f) => !q || sinTildes(f.marca).includes(q) || sinTildes(f.financiera).includes(q));
  const sel = creando ? null : (filas.find((f) => f.id === selId) ?? filas[0] ?? null);

  const marcasCat = marcas.filter((m) => m.categoriaId === categoria.id);
  const hayLibres = enCategoria.length < marcasCat.length * financieras.length;

  const ultima = tasas.reduce<Tasa | null>(
    (max, t) => (!max || t.actualizadoEn > max.actualizadoEn ? t : max),
    null,
  );
  const porQuien = ultima?.actualizadoPor ? `, por ${ultima.actualizadoPor.split(" ")[0]}` : "";

  return (
    <>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="title-1 m-0">Tasas de crédito</h1>
            <div className="callout text-ink-secondary">
              Lo que definas aquí es lo que el staff ve en la calculadora.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TextField
              className="w-full sm:w-60"
              placeholder="Buscar marca o financiera"
              leading="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <SegmentedControl
              label="Categoría"
              options={categorias.map((c) => ({
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

        <div className="hidden grid-cols-3 gap-4 lg:grid">
          <StatCard
            label="Tasas activas"
            value={String(enCategoria.filter((t) => t.activa).length)}
            hint={`en ${categoria.nombre.toLowerCase()}`}
          />
          <StatCard
            label="Financieras"
            value={String(financieras.length)}
            hint={financieras.map((f) => f.nombre).join(" · ") || "Crea la primera en Financieras"}
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
            className="hidden overflow-x-auto lg:block"
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
          <ListaMovil
            filas={filas}
            tarjeta={(f) => ({
              titulo: `${f.marca} · ${f.financiera}`,
              detalle: `${f.tipo === "mensual" ? "Mensual" : "Efectiva anual"} · plazos ${f.plazos.join(", ")}`,
              lado: (
                <>
                  <span className="data">{pct(f.tasa)}</span>
                  {f.activa ? null : <Badge>Inactiva</Badge>}
                </>
              ),
            })}
            onElegir={(f) => {
              setSelId(f.id);
              setCreando(false);
            }}
            vacio={
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
          marcas={marcasCat}
          financieras={financieras}
          existentes={enCategoria}
          onCreada={(id) => {
            setCreando(false);
            setBusqueda("");
            setSelId(id);
          }}
          abierto
          onCerrar={() => setCreando(false)}
        />
      ) : sel ? (
        <Inspector
          key={`${sel.id}-${sel.actualizadoEn}`}
          categoria={categoria}
          marcas={marcasCat}
          financieras={financieras}
          existentes={enCategoria}
          tasa={sel}
          // En celular solo se abre al tocar una tasa.
          abierto={sel.id === selId}
          onCerrar={() => setSelId(null)}
        />
      ) : null}
    </>
  );
}
