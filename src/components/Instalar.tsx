"use client";

import { useEffect, useRef, useState } from "react";
import { Mark } from "./Mark";
import { Button, Icon, SegmentedControl } from "./ui";
import { useInstalar } from "@/lib/instalar";

/** Hoja con los pasos para instalar: en iPhone, Compartir › Agregar a inicio; en Android, el aviso de Chrome. */
export function HojaInstalar({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const inst = useInstalar();
  const ref = useRef<HTMLDialogElement>(null);
  const [plataforma, setPlataforma] = useState<"iphone" | "android">(
    inst.iphone || !inst.nativo ? "iphone" : "android",
  );

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  return (
    <dialog
      ref={ref}
      className="es-hoja-abajo"
      aria-label="Instalar Esgode"
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="mx-auto mb-2 h-[5px] w-9 rounded-pill bg-hairline" aria-hidden="true" />
      <div className="flex items-center gap-3.5">
        <div className="flex size-14 flex-none items-center justify-center rounded-[13px] border border-hairline bg-white">
          <Mark size={40} />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="title-3">Instala Esgode</div>
          <div className="callout text-ink-secondary">
            Ábrela desde la pantalla de inicio, a pantalla completa y más rápido.
          </div>
        </div>
      </div>
      <SegmentedControl
        className="flex [&>button]:flex-1"
        label="Tu celular"
        options={[
          { value: "iphone", label: "iPhone" },
          { value: "android", label: "Android" },
        ]}
        value={plataforma}
        onChange={(v) => setPlataforma(v as "iphone" | "android")}
      />
      {plataforma === "iphone" ? (
        <>
          <ol className="m-0 flex list-none flex-col overflow-hidden rounded-lg bg-surface-sunken p-0">
            {[
              <>
                Abre esta página en <b>Safari</b>
              </>,
              <>
                Toca{" "}
                <span className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-raised px-1.5 font-semibold">
                  Compartir
                </span>
              </>,
              <>
                Elige{" "}
                <span className="rounded-md border border-hairline bg-surface-raised px-1.5 font-semibold">
                  Agregar a inicio
                </span>{" "}
                y toca <b>Agregar</b>
              </>,
            ].map((paso, i) => (
              <li key={i} className="body flex items-center gap-3 border-b border-hairline px-3.5 py-3 last:border-b-0">
                <span className="flex size-6 flex-none items-center justify-center rounded-pill bg-accent text-[13px] font-semibold text-on-accent">
                  {i + 1}
                </span>
                <span>{paso}</span>
              </li>
            ))}
          </ol>
          <Button size="lg" pill onClick={onCerrar}>
            Entendido
          </Button>
        </>
      ) : (
        <>
          <div className="body text-ink-secondary">
            {inst.nativo
              ? "Chrome te pedirá confirmar. La app queda en tu pantalla de inicio y en el cajón de apps."
              : "Abre esta página en Chrome y elige «Instalar app» en el menú ⋮."}
          </div>
          {inst.nativo ? (
            <Button
              size="lg"
              pill
              onClick={async () => {
                if (await inst.instalar()) onCerrar();
              }}
            >
              Instalar app
            </Button>
          ) : null}
        </>
      )}
      <Button
        variant="plain"
        className="self-center"
        onClick={() => {
          inst.descartar();
          onCerrar();
        }}
      >
        Ahora no
      </Button>
    </dialog>
  );
}

/** Botón «Instalar» de la cabecera del celular; se oculta si ya está instalada o se descartó. */
export function BotonInstalar() {
  const inst = useInstalar();
  const [abierta, setAbierta] = useState(false);
  if (!inst.disponible && !abierta) return null;
  return (
    <>
      <Button variant="tinted" size="sm" pill onClick={() => setAbierta(true)}>
        Instalar
      </Button>
      <HojaInstalar abierta={abierta} onCerrar={() => setAbierta(false)} />
    </>
  );
}

/** Tarjeta del menú lateral en escritorio: usa el aviso nativo de Chrome o Edge. */
export function TarjetaInstalar() {
  const inst = useInstalar();
  const [abierta, setAbierta] = useState(false);
  if (!inst.disponible && !abierta) return null;
  return (
    <div className="es-side__install">
      <div className="es-side__install-head">
        <span className="es-side__install-icon">
          <Icon name="plus" />
        </span>
        <span className="es-side__install-title">Instala Esgode</span>
      </div>
      <div className="es-side__install-text">
        Ábrela desde el escritorio o el Dock como una app, sin buscar la pestaña.
      </div>
      <div className="es-side__install-actions">
        <Button size="sm" onClick={() => (inst.nativo ? inst.instalar() : setAbierta(true))}>
          Instalar app
        </Button>
        <Button variant="plain" size="sm" onClick={inst.descartar}>
          Ahora no
        </Button>
      </div>
      <HojaInstalar abierta={abierta} onCerrar={() => setAbierta(false)} />
    </div>
  );
}
