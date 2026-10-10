"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Mark } from "@/components/Mark";
import { Avatar, Badge, Button, SegmentedControl, TextField, cx } from "@/components/ui";
import { cotizar, type Cotizacion } from "@/lib/finanzas";
import { cop, fechaHora, pct } from "@/lib/formato";
import { nombreDe } from "@/lib/formato";
import { cerrarSesion, useRequerirRol, useStore } from "@/lib/store";
import type { Datos, Tasa, Usuario } from "@/lib/types";

const INICIALES = [0, 10, 20, 30];

/** Opciones de cuota inicial: desde el mínimo de la financiera hacia arriba. */
function opcionesInicial(min: number): number[] {
  return [min, ...INICIALES.filter((p) => p > min)];
}

const etiquetaTipo = (t: Tasa) => (t.tipo === "mensual" ? "Tasa mensual" : "Efectiva anual");
const tasaCorta = (t: Tasa) => pct(t.tasa) + (t.tipo === "mensual" ? " mensual" : " E.A.");

export default function CalculadoraPage() {
  const usuario = useRequerirRol(["staff", "admin"]);
  const datos = useStore();
  if (!usuario) return null;
  return <Calculadora usuario={usuario} datos={datos} />;
}

function Calculadora({ usuario, datos }: { usuario: Usuario; datos: Datos }) {
  const tasas = datos.tasas.filter((t) => t.activa);
  const [categoriaId, setCategoriaId] = useState("");
  const [marcaId, setMarcaId] = useState("");
  const [financieraId, setFinancieraId] = useState("");
  const [precio, setPrecio] = useState(0);
  const [productoId, setProductoId] = useState("");
  const [inicialSel, setInicialSel] = useState(-1);
  const [plazoSel, setPlazoSel] = useState(12);
  const [menu, setMenu] = useState(false);
  const [aviso, setAviso] = useState("");

  // Cada selección cae a la primera opción válida si la tasa elegida deja de existir.
  const categorias = datos.categorias.filter((c) => tasas.some((t) => t.categoriaId === c.id));
  const categoria = categorias.find((c) => c.id === categoriaId) ?? categorias[0];
  const enCategoria = tasas.filter((t) => t.categoriaId === categoria?.id);
  const marcas = datos.marcas.filter((m) => enCategoria.some((t) => t.marcaId === m.id));
  // Al cambiar de categoría se conserva la marca si existe allí con el mismo nombre.
  const marca =
    marcas.find((m) => m.id === marcaId) ??
    marcas.find((m) => m.nombre === nombreDe(datos.marcas, marcaId)) ??
    marcas[0];
  const opciones = datos.financieras.flatMap((f) => {
    const t = enCategoria.find((x) => x.marcaId === marca?.id && x.financieraId === f.id);
    return t ? [{ financiera: f, tasa: t }] : [];
  });
  const elegida = opciones.find((o) => o.financiera.id === financieraId) ?? opciones[0];

  const productos = datos.productos.filter((p) => p.activo && p.marcaId === marca?.id);
  // El producto solo cuenta mientras el precio siga siendo el suyo.
  const producto = productos.find((p) => p.id === productoId && p.precio === precio);

  const esAdmin = usuario.rol === "admin";

  // Celular: una columna con las acciones fijas abajo. Escritorio: formulario a la
  // izquierda y resultado a la derecha; el admin conserva la barra lateral.
  const marco = (contenido: ReactNode) => (
    <div className="lg:flex lg:min-h-dvh">
      {esAdmin ? <AdminSidebar usuario={usuario} className="hidden lg:flex" /> : null}
      <div className="mx-auto flex h-dvh w-full max-w-[480px] min-w-0 flex-col overflow-hidden lg:h-auto lg:max-w-[1040px] lg:flex-1 lg:gap-6 lg:overflow-visible lg:p-6">
        {contenido}
      </div>
    </div>
  );

  const ultima = tasas.reduce((max, t) => (t.actualizadoEn > max ? t.actualizadoEn : max), "");

  const encabezado = (
    <header className="flex items-center justify-between px-5 pt-14 pb-3 lg:min-h-14 lg:px-0 lg:pt-0 lg:pb-0">
      <div className="flex flex-col gap-0.5">
        <h1 className="title-1 m-0">Calculadora</h1>
        <div className="callout text-ink-secondary">
          {ultima ? `Tasas actualizadas ${fechaHora(ultima)}` : "Sin tasas activas"}
        </div>
      </div>
      <div className={cx("relative flex items-center gap-3", esAdmin && "lg:hidden")}>
        <Mark size={28} />
        <button
          type="button"
          className="cursor-pointer rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={`Cuenta de ${usuario.nombre}`}
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu((v) => !v)}
        >
          <Avatar name={usuario.nombre} size="lg" />
        </button>
        {menu ? (
          <div
            role="menu"
            className="absolute top-full right-0 z-10 mt-2 flex w-56 flex-col gap-3 rounded-lg border border-hairline bg-surface-raised p-4 shadow-(--shadow-popover)"
          >
            <div>
              <div className="headline">{usuario.nombre}</div>
              <div className="footnote text-ink-secondary">
                {usuario.rol === "admin" ? "Administrador" : "Staff"}
              </div>
            </div>
            {usuario.rol === "admin" ? (
              <Link role="menuitem" href="/admin/tasas" className="es-btn es-btn--tinted es-btn--md">
                Editar tasas
              </Link>
            ) : null}
            <Button variant="secondary" onClick={cerrarSesion}>
              Cerrar sesión
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );

  if (!categoria || !marca || !elegida) {
    return marco(
      <>
        {encabezado}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 pb-24 text-center">
          <Mark size={64} className="mb-4" />
          <div className="title-3">Aún no hay tasas activas</div>
          <div className="callout text-ink-secondary">
            Cuando administración active una tasa, podrás cotizar aquí.
          </div>
        </div>
      </>,
    );
  }

  const tasa = elegida.tasa;
  const plazo = tasa.plazos.includes(plazoSel) ? plazoSel : tasa.plazos[0];
  const iniciales = opcionesInicial(tasa.inicialMin);
  const inicial = iniciales.includes(inicialSel) ? inicialSel : iniciales[0];
  const c: Cotizacion = cotizar({ precio, inicial, plazo, tipo: tasa.tipo, tasa: tasa.tasa });

  const texto = [
    "Cotización Esgode",
    producto ? `${marca.nombre} ${producto.nombre}` : `${categoria.nombre} · ${marca.nombre}`,
    `Financiera: ${elegida.financiera.nombre}`,
    `Precio: ${cop(precio)}`,
    `Cuota inicial (${inicial} %): ${cop(c.inicialValor)}`,
    `${plazo} cuotas de ${cop(c.cuota)}`,
    `Total: ${cop(c.total)}`,
    "Valores aproximados, sujetos a aprobación de la financiera.",
  ].join("\n");

  async function compartir() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Cotización Esgode", text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      setAviso("Cotización copiada. Pégala donde la necesites.");
    } catch (e) {
      // Cancelar el diálogo de compartir no es un error.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setAviso("No se pudo compartir. Copia los valores de la tarjeta.");
    }
  }

  const tarjeta = (
    <section className="es-card flex flex-col gap-3 p-5" aria-live="polite">
      <div className="flex items-center justify-between">
        <div className="es-caption-label">Cuota mensual</div>
        <Badge tone="accent">{elegida.financiera.nombre}</Badge>
      </div>
      <div className="display tabular-nums">{cop(c.cuota)}</div>
      <div className="callout text-ink-secondary">
        {plazo} cuotas · {tasaCorta(tasa)} · inicial {cop(c.inicialValor)}
      </div>
      <div className="h-px bg-hairline" />
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Financia", c.financia],
          ["Intereses", c.intereses],
          ["Total", c.total],
        ].map(([nombre, valor]) => (
          <div key={nombre} className="flex flex-col gap-0.5">
            <span className="footnote text-ink-secondary">{nombre}</span>
            <span className="data">{cop(valor as number)}</span>
          </div>
        ))}
      </div>
    </section>
  );

  return marco(
    <>
      {encabezado}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-none lg:flex-row lg:items-start lg:gap-6">
        <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-1 pb-6 lg:min-w-0 lg:overflow-visible lg:p-0">
          <section className="flex flex-col gap-2">
            <div className="es-caption-label">Categoría</div>
            <SegmentedControl
              className="flex [&>button]:flex-1"
              label="Categoría"
              options={categorias.map((x) => ({ value: x.id, label: x.nombre }))}
              value={categoria.id}
              onChange={setCategoriaId}
            />
          </section>

          <section className="flex flex-col gap-2">
            <div className="es-caption-label">Marca</div>
            <div className="flex flex-wrap gap-2">
              {marcas.map((m) => (
                <Button
                  key={m.id}
                  variant={m.id === marca.id ? "tinted" : "secondary"}
                  pill
                  onClick={() => setMarcaId(m.id)}
                >
                  {m.nombre}
                </Button>
              ))}
            </div>
          </section>

          {productos.length ? (
            <section className="flex flex-col gap-2">
              <div className="es-caption-label">Producto</div>
              <div className="flex flex-wrap gap-2">
                {productos.map((p) => (
                  <Button
                    key={p.id}
                    variant={p.id === producto?.id ? "tinted" : "secondary"}
                    pill
                    onClick={() => {
                      setProductoId(p.id);
                      setPrecio(p.precio);
                      setAviso("");
                    }}
                  >
                    {p.nombre}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-2">
            <div className="es-caption-label">Financiera</div>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Financiera">
              {opciones.map(({ financiera, tasa: t }) => {
                const on = financiera.id === elegida.financiera.id;
                return (
                  <button
                    key={financiera.id}
                    type="button"
                    className={on ? "fin fin--on" : "fin"}
                    role="radio"
                    aria-checked={on}
                    onClick={() => setFinancieraId(financiera.id)}
                  >
                    <span className="radio" aria-hidden="true">
                      <i />
                    </span>
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="headline">{financiera.nombre}</span>
                      <span className="callout text-ink-secondary">
                        {etiquetaTipo(t)} · plazos {t.plazos.join(", ")}
                        {t.inicialMin ? ` · inicial mín. ${t.inicialMin} %` : ""}
                      </span>
                    </span>
                    <span className="data tabular-nums">{pct(t.tasa)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <TextField
              className="max-w-none"
              label="Precio del producto"
              placeholder="$ 0"
              inputMode="numeric"
              value={precio ? cop(precio) : ""}
              onChange={(e) => {
                setPrecio(Number(e.target.value.replace(/[^0-9]/g, "").slice(0, 10)));
                setAviso("");
              }}
              hint="Precio de venta sin descuentos."
            />
            <div className="flex flex-col gap-2">
              <div className="callout text-ink-secondary">Cuota inicial</div>
              <SegmentedControl
                className="flex [&>button]:flex-1"
                label="Cuota inicial"
                options={iniciales.map((p) => ({ value: String(p), label: `${p} %` }))}
                value={String(inicial)}
                onChange={(v) => setInicialSel(Number(v))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="callout text-ink-secondary">Plazo (meses)</div>
              <SegmentedControl
                className="flex [&>button]:flex-1"
                label="Plazo en meses"
                options={tasa.plazos.map((p) => ({ value: String(p), label: String(p) }))}
                value={String(plazo)}
                onChange={(v) => setPlazoSel(Number(v))}
              />
            </div>
          </section>

          <div className="lg:hidden">{tarjeta}</div>
        </main>

        <aside className="flex flex-col lg:sticky lg:top-6 lg:w-[380px] lg:flex-none lg:gap-4">
          <div className="hidden lg:block">{tarjeta}</div>
          <footer className="flex flex-col gap-2 border-t border-hairline bg-surface px-5 pt-3 pb-8 lg:flex-col-reverse lg:border-0 lg:p-0">
            {aviso ? (
              <div className="callout text-center text-ink-secondary" role="status">
                {aviso}
              </div>
            ) : null}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                icon="chat"
                label="Enviar por WhatsApp"
                disabled={!precio}
                onClick={() =>
                  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener")
                }
              />
              <Button size="lg" pill className="flex-1" disabled={!precio} onClick={compartir}>
                Compartir cotización
              </Button>
            </div>
          </footer>
        </aside>
      </div>
    </>,
  );
}
