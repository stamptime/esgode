"use client";

import { useEffect, useRef, useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Mark } from "@/components/Mark";
import { Button } from "@/components/ui";
import { useRequerirRol } from "@/lib/store";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const usuario = useRequerirRol(["admin"]);
  const cajon = useRef<HTMLDialogElement>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const d = cajon.current;
    if (!d) return;
    if (menu && !d.open) d.showModal();
    if (!menu && d.open) d.close();
  }, [menu]);

  if (!usuario) return null;

  return (
    <div className="min-h-dvh lg:flex">
      <AdminSidebar usuario={usuario} className="hidden lg:flex" />

      {/* Celular: barra superior y menú en cajón. */}
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-hairline bg-surface px-4 lg:hidden">
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

      <div className="flex min-w-0 flex-1 flex-wrap">{children}</div>
    </div>
  );
}
