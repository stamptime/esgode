"use client";

import { usePathname, useRouter } from "next/navigation";
import { Mark } from "./Mark";
import { Button, SidebarNav, cx, type SidebarItem } from "./ui";
import { cerrarSesion } from "@/lib/store";
import type { Usuario } from "@/lib/types";

// Las secciones sin ruta aún no están diseñadas (docs/handoff/design-system/screens.md).
const RUTAS: Record<string, string> = {
  tasas: "/admin/tasas",
  calc: "/calculadora",
};

const NAV: SidebarItem[] = [
  { id: "inicio", label: "Inicio", icon: "home", disabled: true },
  { id: "clientes", label: "Clientes", icon: "person", disabled: true },
  { id: "pedidos", label: "Pedidos", icon: "cart", disabled: true },
  { id: "conversaciones", label: "Conversaciones", icon: "chat", disabled: true },
  { id: "productos", label: "Productos", icon: "box", disabled: true },
  { section: "Crédito" },
  { id: "tasas", label: "Tasas", icon: "chart" },
  { id: "calc", label: "Calculadora", icon: "plus" },
  { section: "Equipo" },
  { id: "usuarios", label: "Usuarios y roles", icon: "person", disabled: true },
];

export function AdminSidebar({ usuario, className }: { usuario: Usuario; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const activo = Object.keys(RUTAS).find((id) => pathname.startsWith(RUTAS[id]));
  return (
    <SidebarNav
      className={cx("sticky top-0 h-dvh flex-none", className)}
      items={NAV}
      activeId={activo}
      onSelect={(id) => RUTAS[id] && router.push(RUTAS[id])}
      brand="esgode"
      logo={<Mark size={24} />}
      user={{ name: usuario.nombre, role: "Administrador" }}
      userAction={
        <Button variant="plain" size="sm" onClick={cerrarSesion}>
          Salir
        </Button>
      }
    />
  );
}
