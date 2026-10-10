"use client";

import { useEffect, useRef, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Mark } from "./Mark";
import { Button } from "./ui";
import type { Usuario } from "@/lib/types";

/** Navegación del admin en celular: barra superior y el menú en un cajón. Oculta desde 1024px. */
export function AdminBarraMovil({ usuario }: { usuario: Usuario }) {
  const cajon = useRef<HTMLDialogElement>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const d = cajon.current;
    if (!d) return;
    if (menu && !d.open) d.showModal();
    if (!menu && d.open) d.close();
  }, [menu]);

  return (
    <>
      <div className="sticky top-0 z-10 flex h-14 flex-none items-center justify-between border-b border-hairline bg-surface px-4 lg:hidden">
        <div className="wordmark-sm flex items-center gap-2">
          <Mark size={24} />
          esgode
        </div>
        <Button variant="secondary" icon="menu" label="Abrir menú" onClick={() => setMenu(true)} />
      </div>
      <dialog
        ref={cajon}
        className="es-drawer"
        aria-label="Menú"
        onClose={() => setMenu(false)}
        onClick={(e) => {
          // Tocar fuera del cajón lo cierra.
          if (e.target === e.currentTarget) setMenu(false);
        }}
      >
        <AdminSidebar usuario={usuario} className="!h-full w-full" onNavegar={() => setMenu(false)} />
      </dialog>
    </>
  );
}
